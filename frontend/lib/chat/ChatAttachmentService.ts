import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { appendChatControlEvent, createChatAttachment, getChatAttachmentById, markChatAttachmentUploaded } from "./store";
import { sha256Hex } from "./hash";
import type { ChatActor, ChatAttachmentSnapshot } from "./types";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "docx"]);

function getSigningSecret() {
  return String(process.env.CHAT_ATTACHMENT_SIGNING_SECRET || process.env.RRE_SESSION_SECRET || "dev-chat-attachment-secret");
}

function sanitizeFileName(fileName: string) {
  return String(fileName || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extFromFileName(fileName: string) {
  const ext = path.extname(fileName).replace(".", "").toLowerCase();
  return ext;
}

function signValue(value: string) {
  return crypto.createHmac("sha256", getSigningSecret()).update(value, "utf8").digest("hex");
}

function buildUploadToken(payload: { attachmentId: string; actorId: string; expiresAt: string }) {
  const raw = `${payload.attachmentId}|${payload.actorId}|${payload.expiresAt}`;
  const sig = signValue(raw);
  return Buffer.from(`${raw}|${sig}`, "utf8").toString("base64url");
}

function parseUploadToken(token: string) {
  const raw = Buffer.from(String(token || ""), "base64url").toString("utf8");
  const [attachmentId, actorId, expiresAt, sig] = raw.split("|");
  if (!attachmentId || !actorId || !expiresAt || !sig) throw new Error("CHAT_ATTACHMENT_TOKEN_INVALID");
  const expected = signValue(`${attachmentId}|${actorId}|${expiresAt}`);
  if (!crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))) {
    throw new Error("CHAT_ATTACHMENT_TOKEN_INVALID");
  }
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs) || expiresMs < Date.now()) {
    throw new Error("CHAT_ATTACHMENT_TOKEN_EXPIRED");
  }
  return { attachmentId, actorId, expiresAt };
}

export async function requestChatAttachmentUpload(input: {
  actor: ChatActor;
  fileName: string;
  mime: string;
  size: number;
}) {
  const fileName = sanitizeFileName(input.fileName);
  const mime = String(input.mime || "").trim().toLowerCase();
  const size = Number(input.size || 0);

  if (!fileName) throw new Error("CHAT_ATTACHMENT_NAME_REQUIRED");
  if (!ALLOWED_MIME_TYPES.has(mime)) throw new Error("CHAT_ATTACHMENT_MIME_NOT_ALLOWED");
  if (!Number.isFinite(size) || size <= 0 || size > MAX_ATTACHMENT_BYTES) {
    throw new Error("CHAT_ATTACHMENT_SIZE_INVALID");
  }

  const ext = extFromFileName(fileName);
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error("CHAT_ATTACHMENT_EXTENSION_NOT_ALLOWED");

  const attachment = await createChatAttachment({
    uploadedBy: input.actor.actorId,
    uploadedByRole: input.actor.actorRole,
    fileName,
    mime,
    size,
  });

  await appendChatControlEvent({
    threadId: null,
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    eventType: "ATTACHMENT_CREATED",
    metadata: {
      attachmentId: attachment.attachmentId,
      fileName,
      mime,
      size,
    },
  });

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const token = buildUploadToken({
    attachmentId: attachment.attachmentId,
    actorId: input.actor.actorId,
    expiresAt,
  });

  const uploadUrl = `/api/chat/attachments/upload?attachmentId=${encodeURIComponent(attachment.attachmentId)}&token=${encodeURIComponent(token)}`;

  return {
    attachmentId: attachment.attachmentId,
    uploadUrl,
    method: "PUT" as const,
    headers: {
      "content-type": mime,
    },
    expiresAt,
  };
}

export async function uploadChatAttachmentBinary(input: {
  actor: ChatActor;
  attachmentId: string;
  token: string;
  mime: string;
  buffer: Buffer;
}) {
  const parsed = parseUploadToken(input.token);
  if (parsed.attachmentId !== input.attachmentId) throw new Error("CHAT_ATTACHMENT_TOKEN_MISMATCH");
  if (parsed.actorId !== input.actor.actorId) throw new Error("CHAT_ATTACHMENT_TOKEN_FORBIDDEN");

  const existing = await getChatAttachmentById(input.attachmentId);
  if (!existing) throw new Error("CHAT_ATTACHMENT_NOT_FOUND");
  if (existing.uploadedBy !== input.actor.actorId) throw new Error("CHAT_ATTACHMENT_FORBIDDEN");

  const mime = String(input.mime || "").trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mime)) throw new Error("CHAT_ATTACHMENT_MIME_NOT_ALLOWED");

  const size = input.buffer.length;
  if (size <= 0 || size > MAX_ATTACHMENT_BYTES) throw new Error("CHAT_ATTACHMENT_SIZE_INVALID");

  const fileName = sanitizeFileName(existing.fileName || "attachment.bin");
  const storageKey = `chat/${existing.attachmentId}_${fileName}`;
  const filePath = path.join(process.cwd(), "public", "uploads", storageKey);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, input.buffer);

  const sha256 = sha256Hex(input.buffer);

  const updated = await markChatAttachmentUploaded({
    attachmentId: input.attachmentId,
    storageKey,
    sha256,
  });

  await appendChatControlEvent({
    threadId: null,
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    eventType: "ATTACHMENT_UPLOADED",
    metadata: {
      attachmentId: input.attachmentId,
      storageKey,
      sha256,
      bytes: size,
    },
  });

  return {
    attachmentId: updated?.attachmentId || input.attachmentId,
    storageKey,
    url: `/uploads/${storageKey}`,
    sha256,
    size,
  };
}

export async function resolveAttachmentSnapshots(input: {
  actor: ChatActor;
  attachmentIds: string[];
}): Promise<ChatAttachmentSnapshot[]> {
  const snapshots: ChatAttachmentSnapshot[] = [];

  for (const id of input.attachmentIds) {
    const attachmentId = String(id || "").trim();
    if (!attachmentId) continue;

    const attachment = await getChatAttachmentById(attachmentId);
    if (!attachment) throw new Error(`CHAT_ATTACHMENT_NOT_FOUND:${attachmentId}`);
    if (attachment.uploadStatus !== "UPLOADED") throw new Error(`CHAT_ATTACHMENT_NOT_UPLOADED:${attachmentId}`);
    if (attachment.uploadedBy !== input.actor.actorId) throw new Error(`CHAT_ATTACHMENT_FORBIDDEN:${attachmentId}`);

    snapshots.push({
      attachmentId: attachment.attachmentId,
      name: attachment.fileName,
      mime: attachment.mime,
      size: attachment.size,
      sha256: String(attachment.sha256 || "").toLowerCase(),
      storageKey: attachment.storageKey || undefined,
      uploadedAt: attachment.uploadedAt || undefined,
    });
  }

  return snapshots;
}
