import crypto from "crypto";
import { getDb } from "../db/mongo";
import { canonicalPayloadHash, deterministicId } from "./hash";
import type {
  ChatAttachmentRecord,
  ChatCaseRecord,
  ChatControlEventRecord,
  ChatControlEventType,
  ChatMessageRecord,
  ChatParticipant,
  ChatRedactionEventRecord,
  ChatThreadRecord,
  ChatThreadStatus,
  ChatThreadType,
} from "./types";

const THREAD_COLLECTION = "chat_threads";
const MESSAGE_COLLECTION = "chat_messages";
const ATTACHMENT_COLLECTION = "chat_attachments";
const REDACTION_COLLECTION = "chat_redaction_events";
const CONTROL_COLLECTION = "chat_control_events";
const CASE_COLLECTION = "chat_crm_cases";

let indexesReady: Promise<void> | null = null;

function nowIso() {
  return new Date().toISOString();
}

function toPublic<T>(raw: any): T {
  const { _id, ...rest } = raw || {};
  return {
    ...rest,
    _id: _id?.toString?.() || undefined,
  } as T;
}

function normalizeParticipants(participants: ChatParticipant[]) {
  const map = new Map<string, ChatParticipant>();
  for (const entry of participants) {
    const key = `${entry.userId}:${entry.role}`;
    if (!entry.userId || !entry.role) continue;
    map.set(key, {
      userId: String(entry.userId).trim(),
      role: entry.role,
      orgId: entry.orgId ? String(entry.orgId).trim() : undefined,
      supplierId: entry.supplierId ? String(entry.supplierId).trim() : undefined,
      buyerId: entry.buyerId ? String(entry.buyerId).trim() : undefined,
    });
  }
  return Array.from(map.values()).sort((left, right) => `${left.role}:${left.userId}`.localeCompare(`${right.role}:${right.userId}`));
}

function computeThreadHash(input: {
  threadId: string;
  type: ChatThreadType;
  relatedEntityType: string;
  relatedEntityId: string | null;
  participants: ChatParticipant[];
  status: ChatThreadStatus;
  caseId: string | null;
  updatedAt: string;
}) {
  return canonicalPayloadHash({
    threadId: input.threadId,
    type: input.type,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    participants: normalizeParticipants(input.participants),
    status: input.status,
    caseId: input.caseId,
    updatedAt: input.updatedAt,
  });
}

export async function ensureChatIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();

      await db.collection(THREAD_COLLECTION).createIndex({ threadId: 1 }, { unique: true, name: "chat_thread_id_unique" });
      await db.collection(THREAD_COLLECTION).createIndex({ relatedEntityId: 1, status: 1, updatedAt: -1 }, { name: "chat_thread_related_status_updated" });
      await db.collection(THREAD_COLLECTION).createIndex({ "participants.userId": 1, updatedAt: -1 }, { name: "chat_thread_participant_updated" });
      await db.collection(THREAD_COLLECTION).createIndex({ status: 1, updatedAt: -1 }, { name: "chat_thread_status_updated" });

      await db.collection(MESSAGE_COLLECTION).createIndex({ messageId: 1 }, { unique: true, name: "chat_message_id_unique" });
      await db.collection(MESSAGE_COLLECTION).createIndex({ threadId: 1, createdAt: 1 }, { name: "chat_message_thread_created" });
      await db.collection(MESSAGE_COLLECTION).createIndex({ senderId: 1, createdAt: -1 }, { name: "chat_message_sender_created" });

      await db.collection(ATTACHMENT_COLLECTION).createIndex({ attachmentId: 1 }, { unique: true, name: "chat_attachment_id_unique" });
      await db.collection(ATTACHMENT_COLLECTION).createIndex({ uploadedBy: 1, createdAt: -1 }, { name: "chat_attachment_actor_created" });
      await db.collection(ATTACHMENT_COLLECTION).createIndex({ uploadStatus: 1, createdAt: -1 }, { name: "chat_attachment_status_created" });

      await db.collection(REDACTION_COLLECTION).createIndex({ redactionEventId: 1 }, { unique: true, name: "chat_redaction_event_id_unique" });
      await db.collection(REDACTION_COLLECTION).createIndex({ threadId: 1, createdAt: 1 }, { name: "chat_redaction_thread_created" });
      await db.collection(REDACTION_COLLECTION).createIndex({ messageId: 1, createdAt: -1 }, { name: "chat_redaction_message_created" });

      await db.collection(CONTROL_COLLECTION).createIndex({ eventId: 1 }, { unique: true, name: "chat_control_event_id_unique" });
      await db.collection(CONTROL_COLLECTION).createIndex({ threadId: 1, createdAt: -1 }, { name: "chat_control_thread_created" });
      await db.collection(CONTROL_COLLECTION).createIndex({ actorId: 1, createdAt: -1 }, { name: "chat_control_actor_created" });

      await db.collection(CASE_COLLECTION).createIndex({ caseId: 1 }, { unique: true, name: "chat_case_id_unique" });
      await db.collection(CASE_COLLECTION).createIndex({ threadId: 1, createdAt: -1 }, { name: "chat_case_thread_created" });
      await db.collection(CASE_COLLECTION).createIndex({ status: 1, updatedAt: -1 }, { name: "chat_case_status_updated" });
    })();
  }

  await indexesReady;
}

export async function createChatThread(input: {
  type: ChatThreadType;
  relatedEntityType: ChatThreadRecord["relatedEntityType"];
  relatedEntityId: string | null;
  participants: ChatParticipant[];
  tenantId?: string | null;
}) {
  await ensureChatIndexes();
  const db = await getDb();

  const createdAt = nowIso();
  const threadId = crypto.randomUUID();
  const participants = normalizeParticipants(input.participants);

  const record: ChatThreadRecord = {
    threadId,
    type: input.type,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId || null,
    participants,
    status: "OPEN",
    caseId: null,
    tenantId: input.tenantId || null,
    threadHash: "",
    createdAt,
    updatedAt: createdAt,
    closedAt: null,
    lockedAt: null,
    lockedBy: null,
  };

  record.threadHash = computeThreadHash({
    threadId: record.threadId,
    type: record.type,
    relatedEntityType: record.relatedEntityType,
    relatedEntityId: record.relatedEntityId,
    participants: record.participants,
    status: record.status,
    caseId: record.caseId,
    updatedAt: record.updatedAt,
  });

  const inserted = await db.collection<ChatThreadRecord>(THREAD_COLLECTION).insertOne(record as any);
  return {
    ...record,
    _id: inserted.insertedId.toString(),
  } as ChatThreadRecord;
}

export async function getChatThreadById(threadId: string) {
  await ensureChatIndexes();
  const db = await getDb();
  const row = await db.collection<ChatThreadRecord>(THREAD_COLLECTION).findOne({ threadId: String(threadId || "").trim() });
  if (!row) return null;
  return toPublic<ChatThreadRecord>(row);
}

export async function listChatThreadsForActor(input: {
  actorId: string;
  actorRole: string;
  includeAll?: boolean;
  limit?: number;
  status?: ChatThreadStatus | "ALL";
}) {
  await ensureChatIndexes();
  const db = await getDb();

  const limit = Math.min(Math.max(Number(input.limit || 50), 1), 200);
  const query: Record<string, unknown> = {};

  if (!input.includeAll) {
    query.participants = { $elemMatch: { userId: input.actorId, role: input.actorRole } };
  }

  if (input.status && input.status !== "ALL") query.status = input.status;

  const rows = await db.collection<ChatThreadRecord>(THREAD_COLLECTION).find(query).sort({ updatedAt: -1, threadId: 1 }).limit(limit).toArray();
  return rows.map((row) => toPublic<ChatThreadRecord>(row));
}

export async function updateChatThreadState(input: {
  threadId: string;
  status?: ChatThreadStatus;
  caseId?: string | null;
  closedAt?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
  participants?: ChatParticipant[];
}) {
  await ensureChatIndexes();
  const current = await getChatThreadById(input.threadId);
  if (!current) return null;

  const updatedAt = nowIso();
  const next: ChatThreadRecord = {
    ...current,
    status: input.status || current.status,
    caseId: input.caseId === undefined ? current.caseId : input.caseId,
    closedAt: input.closedAt === undefined ? current.closedAt : input.closedAt,
    lockedAt: input.lockedAt === undefined ? current.lockedAt : input.lockedAt,
    lockedBy: input.lockedBy === undefined ? current.lockedBy : input.lockedBy,
    participants: input.participants ? normalizeParticipants(input.participants) : current.participants,
    updatedAt,
    threadHash: "",
  };

  next.threadHash = computeThreadHash({
    threadId: next.threadId,
    type: next.type,
    relatedEntityType: next.relatedEntityType,
    relatedEntityId: next.relatedEntityId,
    participants: next.participants,
    status: next.status,
    caseId: next.caseId,
    updatedAt: next.updatedAt,
  });

  const db = await getDb();
  await db.collection<ChatThreadRecord>(THREAD_COLLECTION).updateOne(
    { threadId: next.threadId },
    {
      $set: {
        status: next.status,
        caseId: next.caseId,
        closedAt: next.closedAt,
        lockedAt: next.lockedAt,
        lockedBy: next.lockedBy,
        participants: next.participants,
        updatedAt: next.updatedAt,
        threadHash: next.threadHash,
      },
    }
  );

  return next;
}

export async function appendChatMessage(input: {
  threadId: string;
  senderId: string;
  senderRole: ChatMessageRecord["senderRole"];
  body: string;
  attachments: ChatMessageRecord["attachments"];
  systemEvent?: boolean;
  systemEventType?: string | null;
  moderationFlags?: string[];
}) {
  await ensureChatIndexes();
  const db = await getDb();

  const createdAt = nowIso();
  const messageId = crypto.randomUUID();

  const record: ChatMessageRecord = {
    messageId,
    threadId: String(input.threadId || "").trim(),
    senderId: String(input.senderId || "").trim(),
    senderRole: input.senderRole,
    body: String(input.body || ""),
    attachments: input.attachments || [],
    systemEvent: Boolean(input.systemEvent),
    systemEventType: input.systemEvent ? String(input.systemEventType || "SYSTEM_EVENT") : null,
    createdAt,
    messageHash: "",
    moderationFlags: (input.moderationFlags || []).map((entry) => String(entry || "").trim()).filter(Boolean).sort((a, b) => a.localeCompare(b)),
  };

  record.messageHash = canonicalPayloadHash({
    messageId: record.messageId,
    threadId: record.threadId,
    senderId: record.senderId,
    senderRole: record.senderRole,
    body: record.body,
    attachments: record.attachments,
    systemEvent: record.systemEvent,
    systemEventType: record.systemEventType,
    moderationFlags: record.moderationFlags,
    createdAt: record.createdAt,
  });

  const inserted = await db.collection<ChatMessageRecord>(MESSAGE_COLLECTION).insertOne(record as any);

  await updateChatThreadState({ threadId: record.threadId });

  return {
    ...record,
    _id: inserted.insertedId.toString(),
  } as ChatMessageRecord;
}

export async function listChatMessages(input: {
  threadId: string;
  limit?: number;
  before?: string;
}) {
  await ensureChatIndexes();
  const db = await getDb();

  const limit = Math.min(Math.max(Number(input.limit || 200), 1), 500);
  const query: Record<string, unknown> = { threadId: String(input.threadId || "").trim() };

  if (input.before) {
    query.createdAt = { $lt: input.before };
  }

  const rows = await db.collection<ChatMessageRecord>(MESSAGE_COLLECTION).find(query).sort({ createdAt: 1, messageId: 1 }).limit(limit).toArray();
  return rows.map((row) => toPublic<ChatMessageRecord>(row));
}

export async function getChatMessageById(threadId: string, messageId: string) {
  await ensureChatIndexes();
  const db = await getDb();
  const row = await db.collection<ChatMessageRecord>(MESSAGE_COLLECTION).findOne({
    threadId: String(threadId || "").trim(),
    messageId: String(messageId || "").trim(),
  });
  if (!row) return null;
  return toPublic<ChatMessageRecord>(row);
}

export async function createChatAttachment(input: {
  uploadedBy: string;
  uploadedByRole: ChatAttachmentRecord["uploadedByRole"];
  fileName: string;
  mime: string;
  size: number;
}) {
  await ensureChatIndexes();
  const db = await getDb();

  const createdAt = nowIso();
  const attachmentId = crypto.randomUUID();

  const record: ChatAttachmentRecord = {
    attachmentId,
    threadId: null,
    uploadedBy: String(input.uploadedBy || "").trim(),
    uploadedByRole: input.uploadedByRole,
    fileName: String(input.fileName || "").trim(),
    mime: String(input.mime || "").trim().toLowerCase(),
    size: Number(input.size || 0),
    sha256: null,
    storageKey: null,
    uploadStatus: "PENDING",
    createdAt,
    uploadedAt: null,
  };

  const inserted = await db.collection<ChatAttachmentRecord>(ATTACHMENT_COLLECTION).insertOne(record as any);
  return {
    ...record,
    _id: inserted.insertedId.toString(),
  } as ChatAttachmentRecord;
}

export async function getChatAttachmentById(attachmentId: string) {
  await ensureChatIndexes();
  const db = await getDb();
  const row = await db.collection<ChatAttachmentRecord>(ATTACHMENT_COLLECTION).findOne({ attachmentId: String(attachmentId || "").trim() });
  if (!row) return null;
  return toPublic<ChatAttachmentRecord>(row);
}

export async function markChatAttachmentUploaded(input: {
  attachmentId: string;
  storageKey: string;
  sha256: string;
}) {
  await ensureChatIndexes();
  const db = await getDb();

  const uploadedAt = nowIso();
  await db.collection<ChatAttachmentRecord>(ATTACHMENT_COLLECTION).updateOne(
    { attachmentId: String(input.attachmentId || "").trim() },
    {
      $set: {
        uploadStatus: "UPLOADED",
        storageKey: String(input.storageKey || "").trim(),
        sha256: String(input.sha256 || "").trim().toLowerCase(),
        uploadedAt,
      },
    }
  );

  return getChatAttachmentById(input.attachmentId);
}

export async function bindAttachmentsToThread(input: {
  attachmentIds: string[];
  threadId: string;
}) {
  await ensureChatIndexes();
  const db = await getDb();

  const ids = Array.from(new Set((input.attachmentIds || []).map((id) => String(id || "").trim()).filter(Boolean)));
  if (ids.length === 0) return;

  await db.collection<ChatAttachmentRecord>(ATTACHMENT_COLLECTION).updateMany(
    { attachmentId: { $in: ids } },
    { $set: { threadId: String(input.threadId || "").trim() } }
  );
}

export async function appendChatRedactionEvent(input: {
  threadId: string;
  messageId: string;
  reasonCode: string;
  reasonDetail?: string | null;
  redactedBy: string;
  redactedByRole: ChatRedactionEventRecord["redactedByRole"];
}) {
  await ensureChatIndexes();
  const db = await getDb();

  const createdAt = nowIso();
  const payload = {
    threadId: String(input.threadId || "").trim(),
    messageId: String(input.messageId || "").trim(),
    reasonCode: String(input.reasonCode || "").trim(),
    reasonDetail: input.reasonDetail ? String(input.reasonDetail).trim() : null,
    redactedBy: String(input.redactedBy || "").trim(),
    redactedByRole: input.redactedByRole,
    createdAt,
  };

  const redactionEventId = deterministicId("chat_redact", payload);
  const record: ChatRedactionEventRecord = {
    redactionEventId,
    threadId: payload.threadId,
    messageId: payload.messageId,
    reasonCode: payload.reasonCode,
    reasonDetail: payload.reasonDetail,
    redactedBy: payload.redactedBy,
    redactedByRole: payload.redactedByRole,
    createdAt: payload.createdAt,
    redactionHash: canonicalPayloadHash(payload),
  };

  try {
    const inserted = await db.collection<ChatRedactionEventRecord>(REDACTION_COLLECTION).insertOne(record as any);
    return {
      ...record,
      _id: inserted.insertedId.toString(),
    } as ChatRedactionEventRecord;
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await db.collection<ChatRedactionEventRecord>(REDACTION_COLLECTION).findOne({ redactionEventId });
      return existing ? toPublic<ChatRedactionEventRecord>(existing) : record;
    }
    throw error;
  }
}

export async function listChatRedactionEvents(threadId: string) {
  await ensureChatIndexes();
  const db = await getDb();
  const rows = await db.collection<ChatRedactionEventRecord>(REDACTION_COLLECTION).find({ threadId: String(threadId || "").trim() }).sort({ createdAt: 1, redactionEventId: 1 }).toArray();
  return rows.map((row) => toPublic<ChatRedactionEventRecord>(row));
}

export async function appendChatControlEvent(input: {
  threadId: string | null;
  messageId?: string | null;
  actorId: string;
  actorRole: ChatControlEventRecord["actorRole"];
  eventType: ChatControlEventType;
  metadata?: Record<string, unknown> | null;
}) {
  await ensureChatIndexes();
  const db = await getDb();

  const createdAt = nowIso();
  const payload = {
    threadId: input.threadId || null,
    messageId: input.messageId || null,
    actorId: String(input.actorId || "").trim(),
    actorRole: input.actorRole,
    eventType: input.eventType,
    metadata: input.metadata || null,
    createdAt,
  };

  const eventId = deterministicId("chat_evt", payload);
  const record: ChatControlEventRecord = {
    eventId,
    threadId: payload.threadId,
    messageId: payload.messageId,
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    eventType: payload.eventType,
    metadata: payload.metadata,
    eventHash: canonicalPayloadHash(payload),
    createdAt: payload.createdAt,
  };

  try {
    const inserted = await db.collection<ChatControlEventRecord>(CONTROL_COLLECTION).insertOne(record as any);
    return {
      ...record,
      _id: inserted.insertedId.toString(),
    } as ChatControlEventRecord;
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await db.collection<ChatControlEventRecord>(CONTROL_COLLECTION).findOne({ eventId });
      return existing ? toPublic<ChatControlEventRecord>(existing) : record;
    }
    throw error;
  }
}

export async function createChatCase(input: {
  threadId: string;
  category: ChatCaseRecord["category"];
  reasonCode: string;
  createdBy: string;
  createdByRole: ChatCaseRecord["createdByRole"];
}) {
  await ensureChatIndexes();
  const db = await getDb();
  const createdAt = nowIso();

  const payload = {
    threadId: String(input.threadId || "").trim(),
    category: input.category,
    reasonCode: String(input.reasonCode || "").trim(),
    createdBy: String(input.createdBy || "").trim(),
    createdByRole: input.createdByRole,
    createdAt,
  };

  const caseId = deterministicId("chat_case", payload);
  const record: ChatCaseRecord = {
    caseId,
    threadId: payload.threadId,
    category: payload.category,
    status: "OPEN",
    reasonCode: payload.reasonCode,
    createdBy: payload.createdBy,
    createdByRole: payload.createdByRole,
    createdAt: payload.createdAt,
    updatedAt: payload.createdAt,
  };

  try {
    const inserted = await db.collection<ChatCaseRecord>(CASE_COLLECTION).insertOne(record as any);
    return {
      ...record,
      _id: inserted.insertedId.toString(),
    } as ChatCaseRecord;
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await db.collection<ChatCaseRecord>(CASE_COLLECTION).findOne({ caseId });
      return existing ? toPublic<ChatCaseRecord>(existing) : record;
    }
    throw error;
  }
}

export async function listChatCasesByThread(threadId: string) {
  await ensureChatIndexes();
  const db = await getDb();
  const rows = await db.collection<ChatCaseRecord>(CASE_COLLECTION).find({ threadId: String(threadId || "").trim() }).sort({ createdAt: -1, caseId: 1 }).toArray();
  return rows.map((row) => toPublic<ChatCaseRecord>(row));
}
