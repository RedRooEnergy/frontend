import fs from "fs/promises";
import path from "path";
import { getOrders, getSupplierProductRecords } from "../store";
import { buildChatEvidenceFilename, buildChatEvidencePack } from "./ChatExportService";
import { resolveAttachmentSnapshots } from "./ChatAttachmentService";
import { runChatAutomationRules } from "./ChatAutomationRules";
import { checkChatSendRateLimit } from "./rateLimit";
import {
  appendChatControlEvent,
  appendChatMessage,
  appendChatRedactionEvent,
  bindAttachmentsToThread,
  createChatCase,
  createChatThread,
  getChatMessageById,
  getChatThreadById,
  listChatMessages,
  listChatRedactionEvents,
  listChatThreadsForActor,
  updateChatThreadState,
} from "./store";
import {
  canCreateThread,
  canEscalateThread,
  canExportThread,
  canLockThread,
  canPostMessage,
  canReadThread,
} from "./policy";
import { canonicalPayloadHash } from "./hash";
import type {
  ChatActor,
  ChatParticipant,
  ChatRelatedEntityContext,
  ChatRelatedEntityType,
  ChatThreadRecord,
  ChatThreadType,
} from "./types";

const MAX_MESSAGE_BYTES = 64 * 1024;
const CHAT_EVIDENCE_ARTEFACT_DIR = path.join(process.cwd(), "artefacts", "chat", "category-14");

export class ChatServiceError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function asText(value: unknown) {
  return String(value || "").trim();
}

function parseThreadType(value: unknown): ChatThreadType {
  const normalized = asText(value).toUpperCase();
  if (
    normalized === "ORDER" ||
    normalized === "PRODUCT_INQUIRY" ||
    normalized === "COMPLIANCE" ||
    normalized === "FREIGHT" ||
    normalized === "WARRANTY" ||
    normalized === "ADMIN"
  ) {
    return normalized;
  }
  throw new ChatServiceError("CHAT_THREAD_TYPE_INVALID", "Invalid thread type", 400);
}

function parseRelatedEntityType(value: unknown): ChatRelatedEntityType {
  const normalized = asText(value).toUpperCase();
  if (normalized === "ORDER" || normalized === "PRODUCT" || normalized === "CASE" || normalized === "WARRANTY_INCIDENT" || normalized === "NONE") {
    return normalized;
  }
  throw new ChatServiceError("CHAT_RELATED_ENTITY_TYPE_INVALID", "Invalid related entity type", 400);
}

function ensureAllowedKeys(payload: Record<string, unknown>, allowed: string[]) {
  const unknown = Object.keys(payload).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new ChatServiceError("CHAT_UNKNOWN_FIELDS", `Unknown fields: ${unknown.join(", ")}`, 400);
  }
}

function deriveRelatedEntityContext(input: {
  relatedEntityType: ChatRelatedEntityType;
  relatedEntityId: string | null;
}): ChatRelatedEntityContext {
  const relatedEntityType = input.relatedEntityType;
  const relatedEntityId = input.relatedEntityId;

  if (relatedEntityType === "ORDER" && relatedEntityId) {
    const order = getOrders().find((row) => row.orderId === relatedEntityId);
    return {
      relatedEntityType,
      relatedEntityId,
      ownerBuyerEmail: order?.buyerEmail || null,
      supplierId: order?.supplierIds?.[0] || order?.items?.[0]?.supplierId || null,
      participantIds: [
        ...(order?.supplierIds || []),
        ...(order?.buyerEmail ? [`buyer:${order.buyerEmail}`] : []),
      ],
    };
  }

  if (relatedEntityType === "PRODUCT" && relatedEntityId) {
    const product = getSupplierProductRecords().find((row) => row.slug === relatedEntityId || row.id === relatedEntityId);
    return {
      relatedEntityType,
      relatedEntityId,
      supplierId: product?.supplierId || null,
      participantIds: product?.supplierId ? [product.supplierId] : [],
    };
  }

  return {
    relatedEntityType,
    relatedEntityId,
  };
}

function normalizeParticipants(input: {
  actor: ChatActor;
  relatedEntity: ChatRelatedEntityContext;
  requestedParticipants?: Array<{ userId: string; role: string }>;
}) {
  const participants: ChatParticipant[] = [
    {
      userId: input.actor.actorId,
      role: input.actor.actorRole,
    },
  ];

  for (const requested of input.requestedParticipants || []) {
    const userId = asText(requested.userId);
    const role = asText(requested.role).toUpperCase();
    if (!userId) continue;
    if (role !== "BUYER" && role !== "SUPPLIER" && role !== "ADMIN" && role !== "REGULATOR" && role !== "FREIGHT" && role !== "SERVICE_PARTNER") {
      continue;
    }
    participants.push({
      userId,
      role,
    } as ChatParticipant);
  }

  if (input.relatedEntity.supplierId) {
    participants.push({
      userId: input.relatedEntity.supplierId,
      role: "SUPPLIER",
      supplierId: input.relatedEntity.supplierId,
    });
  }

  if (input.relatedEntity.ownerBuyerEmail) {
    participants.push({
      userId: `buyer:${input.relatedEntity.ownerBuyerEmail}`,
      role: "BUYER",
      buyerId: `buyer:${input.relatedEntity.ownerBuyerEmail}`,
    });
  }

  const dedup = new Map<string, ChatParticipant>();
  for (const participant of participants) {
    const key = `${participant.role}:${participant.userId}`;
    dedup.set(key, participant);
  }

  return Array.from(dedup.values());
}

function applyRedactionView(input: {
  messages: Awaited<ReturnType<typeof listChatMessages>>;
  redactions: Awaited<ReturnType<typeof listChatRedactionEvents>>;
}) {
  const redactionMap = new Map<string, (typeof input.redactions)[number]>();
  for (const event of input.redactions) {
    if (!redactionMap.has(event.messageId)) redactionMap.set(event.messageId, event);
  }

  return input.messages.map((message) => {
    const redaction = redactionMap.get(message.messageId);
    if (!redaction) {
      return {
        ...message,
        redaction: {
          isRedacted: false,
          redactedAt: null,
          redactionEventId: null,
        },
      };
    }

    return {
      ...message,
      body: "[REDACTED]",
      redaction: {
        isRedacted: true,
        redactedAt: redaction.createdAt,
        redactionEventId: redaction.redactionEventId,
      },
    };
  });
}

function computeThreadEtag(thread: ChatThreadRecord, messageCount: number) {
  return `W/\"${canonicalPayloadHash({ threadId: thread.threadId, threadHash: thread.threadHash, updatedAt: thread.updatedAt, messageCount })}\"`;
}

async function persistThreadEvidencePack(input: {
  threadId: string;
  generatedAt: string;
  zipBuffer: Buffer;
  manifestJson: string;
  manifestHash: string;
}) {
  const fileName = buildChatEvidenceFilename({
    threadId: input.threadId,
    generatedAt: input.generatedAt,
  });
  const zipPath = path.join(CHAT_EVIDENCE_ARTEFACT_DIR, fileName);
  const manifestPath = `${zipPath}.manifest.json`;

  await fs.mkdir(CHAT_EVIDENCE_ARTEFACT_DIR, { recursive: true });
  await fs.writeFile(zipPath, input.zipBuffer);
  await fs.writeFile(manifestPath, `${input.manifestJson}\n`, "utf8");

  return {
    fileName,
    zipPath,
    manifestPath,
    manifestHash: input.manifestHash,
  };
}

export async function createThread(input: {
  actor: ChatActor;
  payload: Record<string, unknown>;
}) {
  ensureAllowedKeys(input.payload, ["type", "relatedEntityType", "relatedEntityId", "participants", "tenantId"]);

  const type = parseThreadType(input.payload.type);
  const relatedEntityType = parseRelatedEntityType(input.payload.relatedEntityType || "NONE");
  const relatedEntityId = asText(input.payload.relatedEntityId) || null;
  const relatedEntity = deriveRelatedEntityContext({ relatedEntityType, relatedEntityId });

  if (!canCreateThread(input.actor, type, relatedEntity)) {
    throw new ChatServiceError("CHAT_CREATE_FORBIDDEN", "Not permitted to create this thread", 403);
  }

  const requestedParticipants = Array.isArray(input.payload.participants)
    ? (input.payload.participants as Array<{ userId: string; role: string }>)
    : [];

  const participants = normalizeParticipants({
    actor: input.actor,
    relatedEntity,
    requestedParticipants,
  });

  const thread = await createChatThread({
    type,
    relatedEntityType,
    relatedEntityId,
    participants,
    tenantId: asText(input.payload.tenantId) || null,
  });

  await appendChatControlEvent({
    threadId: thread.threadId,
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    eventType: "THREAD_CREATED",
    metadata: {
      type,
      relatedEntityType,
      relatedEntityId,
      participantCount: participants.length,
    },
  });

  return thread;
}

export async function listThreads(input: {
  actor: ChatActor;
  status?: string | null;
  limit?: number;
}) {
  const status = asText(input.status || "ALL").toUpperCase();
  const includeAll = input.actor.actorRole === "ADMIN" || input.actor.actorRole === "REGULATOR";

  const raw = await listChatThreadsForActor({
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    includeAll,
    status: status === "ALL" ? "ALL" : (status as any),
    limit: input.limit,
  });

  return raw.filter((thread) => canReadThread(input.actor, thread));
}

export async function listThreadSummaries(input: {
  actor: ChatActor;
  status?: string | null;
  limit?: number;
  search?: string | null;
}) {
  const threads = await listThreads({
    actor: input.actor,
    status: input.status,
    limit: input.limit,
  });

  const search = asText(input.search).toLowerCase();
  const summaries = await Promise.all(
    threads.map(async (thread) => {
      const messages = await listChatMessages({ threadId: thread.threadId, limit: 200 });
      const latest = messages.length > 0 ? messages[messages.length - 1] : null;
      const unreadCount = latest && latest.senderId !== input.actor.actorId ? 1 : 0;

      return {
        threadId: thread.threadId,
        type: thread.type,
        status: thread.status,
        relatedEntityType: thread.relatedEntityType,
        relatedEntityId: thread.relatedEntityId,
        caseId: thread.caseId,
        updatedAt: thread.updatedAt,
        unreadCount,
        participants: thread.participants,
        latestMessage: latest
          ? {
              messageId: latest.messageId,
              senderId: latest.senderId,
              senderRole: latest.senderRole,
              createdAt: latest.createdAt,
              bodyPreview: latest.body.slice(0, 180),
              systemEvent: latest.systemEvent,
            }
          : null,
      };
    })
  );

  if (!search) return summaries;

  return summaries.filter((row) => {
    const haystacks = [
      row.threadId,
      row.type,
      row.status,
      row.relatedEntityType,
      row.relatedEntityId || "",
      row.caseId || "",
      row.latestMessage?.bodyPreview || "",
    ]
      .join(" ")
      .toLowerCase();
    return haystacks.includes(search);
  });
}

export async function getThreadDetail(input: {
  actor: ChatActor;
  threadId: string;
  limit?: number;
  before?: string;
}) {
  const thread = await getChatThreadById(input.threadId);
  if (!thread) throw new ChatServiceError("CHAT_THREAD_NOT_FOUND", "Thread not found", 404);
  if (!canReadThread(input.actor, thread)) throw new ChatServiceError("CHAT_READ_FORBIDDEN", "Forbidden", 403);

  const [messages, redactions] = await Promise.all([
    listChatMessages({ threadId: thread.threadId, limit: input.limit, before: input.before }),
    listChatRedactionEvents(thread.threadId),
  ]);

  const rows = applyRedactionView({ messages, redactions });
  const etag = computeThreadEtag(thread, rows.length);

  return {
    thread,
    messages: rows,
    redactions,
    etag,
  };
}

export async function postMessage(input: {
  actor: ChatActor;
  threadId: string;
  payload: Record<string, unknown>;
}) {
  ensureAllowedKeys(input.payload, ["body", "attachments", "clientMessageId"]);

  const thread = await getChatThreadById(input.threadId);
  if (!thread) throw new ChatServiceError("CHAT_THREAD_NOT_FOUND", "Thread not found", 404);
  if (!canPostMessage(input.actor, thread)) throw new ChatServiceError("CHAT_POST_FORBIDDEN", "Forbidden", 403);

  const body = String(input.payload.body || "");
  if (!body.trim()) throw new ChatServiceError("CHAT_MESSAGE_BODY_REQUIRED", "Message body required", 400);

  const bodyBytes = Buffer.byteLength(body, "utf8");
  if (bodyBytes > MAX_MESSAGE_BYTES) {
    throw new ChatServiceError("CHAT_MESSAGE_TOO_LARGE", "Message exceeds size limit", 413);
  }

  const rateResult = await checkChatSendRateLimit({
    actorId: input.actor.actorId,
    threadId: thread.threadId,
    windowSeconds: Number(process.env.CHAT_MESSAGE_RATE_WINDOW_SECONDS || 60),
    maxPerWindow: Number(process.env.CHAT_MESSAGE_RATE_MAX || 20),
  });
  if (!rateResult.allowed) {
    throw new ChatServiceError("CHAT_RATE_LIMITED", `Rate limit exceeded; retry in ${rateResult.retryAfterSeconds}s`, 429);
  }

  const attachmentIds = Array.isArray(input.payload.attachments)
    ? (input.payload.attachments as unknown[]).map((entry) => asText(entry)).filter(Boolean)
    : [];

  const attachmentSnapshots = await resolveAttachmentSnapshots({
    actor: input.actor,
    attachmentIds,
  });

  const message = await appendChatMessage({
    threadId: thread.threadId,
    senderId: input.actor.actorId,
    senderRole: input.actor.actorRole,
    body,
    attachments: attachmentSnapshots,
    moderationFlags: [],
  });

  if (attachmentIds.length > 0) {
    await bindAttachmentsToThread({
      attachmentIds,
      threadId: thread.threadId,
    });
  }

  await appendChatControlEvent({
    threadId: thread.threadId,
    messageId: message.messageId,
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    eventType: "MESSAGE_POSTED",
    metadata: {
      messageHash: message.messageHash,
      bytes: bodyBytes,
      attachmentCount: attachmentSnapshots.length,
    },
  });

  const automation = await runChatAutomationRules({
    actor: input.actor,
    thread,
    message,
  });

  return {
    threadId: thread.threadId,
    message,
    automation,
    rateLimit: {
      current: rateResult.current,
      max: rateResult.maxPerWindow,
      windowSeconds: rateResult.windowSeconds,
    },
  };
}

export async function lockThread(input: {
  actor: ChatActor;
  threadId: string;
  payload?: Record<string, unknown>;
}) {
  ensureAllowedKeys(input.payload || {}, ["reasonCode"]);

  const thread = await getChatThreadById(input.threadId);
  if (!thread) throw new ChatServiceError("CHAT_THREAD_NOT_FOUND", "Thread not found", 404);
  if (!canLockThread(input.actor, thread)) throw new ChatServiceError("CHAT_LOCK_FORBIDDEN", "Forbidden", 403);

  const reasonCode = asText(input.payload?.reasonCode || "ADMIN_LOCK").toUpperCase();
  const updated = await updateChatThreadState({
    threadId: thread.threadId,
    status: "LOCKED",
    lockedAt: new Date().toISOString(),
    lockedBy: input.actor.actorId,
  });

  await appendChatControlEvent({
    threadId: thread.threadId,
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    eventType: "THREAD_LOCKED",
    metadata: {
      previousStatus: thread.status,
      lockedBy: input.actor.actorId,
      reasonCode,
    },
  });

  await appendChatMessage({
    threadId: thread.threadId,
    senderId: "system",
    senderRole: "SYSTEM",
    body: `Thread locked by admin ${input.actor.actorId}`,
    attachments: [],
    systemEvent: true,
    systemEventType: "THREAD_LOCKED",
  });

  return updated;
}

export async function escalateThread(input: {
  actor: ChatActor;
  threadId: string;
  payload?: Record<string, unknown>;
}) {
  ensureAllowedKeys(input.payload || {}, ["reasonCode", "category"]);

  const thread = await getChatThreadById(input.threadId);
  if (!thread) throw new ChatServiceError("CHAT_THREAD_NOT_FOUND", "Thread not found", 404);
  if (!canEscalateThread(input.actor, thread)) throw new ChatServiceError("CHAT_ESCALATE_FORBIDDEN", "Forbidden", 403);

  if (thread.status === "ESCALATED" || thread.status === "LOCKED") {
    return {
      thread,
      caseId: thread.caseId,
      alreadyEscalated: true,
    };
  }

  const reasonCode = asText(input.payload?.reasonCode || "MANUAL_ESCALATION").toUpperCase();
  const category = asText(input.payload?.category || "SUPPORT").toUpperCase() as any;

  const caseRecord = await createChatCase({
    threadId: thread.threadId,
    category,
    reasonCode,
    createdBy: input.actor.actorId,
    createdByRole: input.actor.actorRole,
  });

  const updated = await updateChatThreadState({
    threadId: thread.threadId,
    status: "ESCALATED",
    caseId: caseRecord.caseId,
  });

  const systemMessage = await appendChatMessage({
    threadId: thread.threadId,
    senderId: "system",
    senderRole: "SYSTEM",
    body: `Thread escalated, Case #${caseRecord.caseId} created`,
    attachments: [],
    systemEvent: true,
    systemEventType: "THREAD_ESCALATED_CASE_CREATED",
  });

  await appendChatControlEvent({
    threadId: thread.threadId,
    messageId: systemMessage.messageId,
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    eventType: "THREAD_ESCALATED",
    metadata: {
      caseId: caseRecord.caseId,
      reasonCode,
      category,
    },
  });

  await appendChatControlEvent({
    threadId: thread.threadId,
    messageId: systemMessage.messageId,
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    eventType: "CASE_CREATED",
    metadata: {
      caseId: caseRecord.caseId,
      category,
      reasonCode,
    },
  });

  return {
    thread: updated,
    caseId: caseRecord.caseId,
    alreadyEscalated: false,
  };
}

export async function redactMessage(input: {
  actor: ChatActor;
  threadId: string;
  payload: Record<string, unknown>;
}) {
  ensureAllowedKeys(input.payload, ["messageId", "reasonCode", "reasonDetail"]);
  const thread = await getChatThreadById(input.threadId);
  if (!thread) throw new ChatServiceError("CHAT_THREAD_NOT_FOUND", "Thread not found", 404);
  if (input.actor.actorRole !== "ADMIN") throw new ChatServiceError("CHAT_REDACT_FORBIDDEN", "Forbidden", 403);

  const messageId = asText(input.payload.messageId);
  if (!messageId) throw new ChatServiceError("CHAT_MESSAGE_ID_REQUIRED", "messageId required", 400);

  const message = await getChatMessageById(thread.threadId, messageId);
  if (!message) throw new ChatServiceError("CHAT_MESSAGE_NOT_FOUND", "Message not found", 404);

  const reasonCode = asText(input.payload.reasonCode).toUpperCase() || "ADMIN_REDACTION";
  const reasonDetail = asText(input.payload.reasonDetail) || null;

  const redaction = await appendChatRedactionEvent({
    threadId: thread.threadId,
    messageId,
    reasonCode,
    reasonDetail,
    redactedBy: input.actor.actorId,
    redactedByRole: input.actor.actorRole,
  });

  const systemMessage = await appendChatMessage({
    threadId: thread.threadId,
    senderId: "system",
    senderRole: "SYSTEM",
    body: `Message ${messageId} redacted by admin`,
    attachments: [],
    systemEvent: true,
    systemEventType: "MESSAGE_REDACTED",
    moderationFlags: [reasonCode],
  });

  await appendChatControlEvent({
    threadId: thread.threadId,
    messageId: systemMessage.messageId,
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    eventType: "MESSAGE_REDACTED",
    metadata: {
      targetMessageId: messageId,
      reasonCode,
      redactionEventId: redaction.redactionEventId,
    },
  });

  return {
    redaction,
  };
}

export async function exportThreadEvidence(input: {
  actor: ChatActor;
  threadId: string;
}) {
  const thread = await getChatThreadById(input.threadId);
  if (!thread) throw new ChatServiceError("CHAT_THREAD_NOT_FOUND", "Thread not found", 404);
  if (!canExportThread(input.actor, thread)) throw new ChatServiceError("CHAT_EXPORT_FORBIDDEN", "Forbidden", 403);

  const [messages, redactions] = await Promise.all([
    listChatMessages({ threadId: thread.threadId, limit: 5000 }),
    listChatRedactionEvents(thread.threadId),
  ]);

  const pack = buildChatEvidencePack({
    thread,
    messages,
    redactions,
  });

  const artifact = await persistThreadEvidencePack({
    threadId: thread.threadId,
    generatedAt: pack.manifest.generatedAt,
    zipBuffer: pack.zipBuffer,
    manifestJson: pack.manifestJson,
    manifestHash: pack.manifestHash,
  });

  await appendChatControlEvent({
    threadId: thread.threadId,
    actorId: input.actor.actorId,
    actorRole: input.actor.actorRole,
    eventType: "THREAD_EXPORTED",
    metadata: {
      jsonHash: pack.jsonHash,
      manifestHash: pack.manifestHash,
      messageCount: messages.length,
      artifactPath: artifact.zipPath,
    },
  });

  return {
    ...pack,
    artifact,
  };
}
