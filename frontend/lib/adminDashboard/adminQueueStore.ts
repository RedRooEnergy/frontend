import { ObjectId } from "mongodb";
import { getDb } from "../db/mongo";

const COLLECTION = "admin_queue_items";

export type QueueStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "RESOLVED" | "CLOSED";
export type QueuePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type QueueType =
  | "SUPPLIER_APPROVAL"
  | "PRODUCT_APPROVAL"
  | "COMPLIANCE_REVIEW"
  | "SHIPPING_EXCEPTION"
  | "PAYMENT_DISPUTE"
  | "REFUND_REQUEST"
  | "WARRANTY_INCIDENT"
  | "GOVERNANCE_HOLD";

export type AdminQueueItem = {
  _id?: string;
  createdAt: string;
  updatedAt: string;
  queueType: QueueType;
  entityType: string;
  entityId: string;
  priority: QueuePriority;
  status: QueueStatus;
  riskScore: number;
  slaDueAt?: string;
  assignedToUserId?: string;
  summary: string;
  governanceRefs?: {
    auditId?: string;
    holdId?: string;
    changeControlId?: string;
  };
  lastActionAuditId?: string;
  requestId?: string | null;
};

type QueueFilters = {
  queueType?: QueueType;
  status?: QueueStatus;
  assignedToUserId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
};

type QueueMutationContext = {
  actorUserId: string;
  actorRole: string;
  justification: string;
  actorEmail?: string | null;
  actorIp?: string | null;
  actorUserAgent?: string | null;
};

let indexesReady: Promise<void> | null = null;

function nowUtc() {
  return new Date().toISOString();
}

async function getCollection() {
  const db = await getDb();
  return db.collection(COLLECTION);
}

async function ensureQueueIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await getCollection();
      await collection.createIndex({ queueType: 1, status: 1 }, { name: "admin_queue_type_status" });
      await collection.createIndex({ status: 1, priority: -1, slaDueAt: 1 }, { name: "admin_queue_status_priority_sla" });
      await collection.createIndex({ entityType: 1, entityId: 1 }, { name: "admin_queue_entity" });
      await collection.createIndex({ createdAt: -1 }, { name: "admin_queue_createdAt" });
      await collection.createIndex(
        { requestId: 1 },
        {
          unique: true,
          sparse: true,
          name: "admin_queue_request_id_unique",
        }
      );
    })();
  }
  await indexesReady;
}

function normalizeId(id: string): ObjectId {
  const normalized = String(id || "").trim();
  if (!ObjectId.isValid(normalized)) {
    throw new Error("INVALID_QUEUE_ID");
  }
  return new ObjectId(normalized);
}

function parsePriorityForSort(priority: QueuePriority) {
  switch (priority) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    default:
      return 1;
  }
}

function toPublic(row: any): AdminQueueItem {
  const { _id, ...rest } = row || {};
  return {
    ...rest,
    _id: _id?.toString?.() || undefined,
  };
}

export async function createQueueItem(
  payload: Omit<AdminQueueItem, "_id" | "createdAt" | "updatedAt" | "status"> & { status?: QueueStatus }
) {
  await ensureQueueIndexes();
  const collection = await getCollection();
  const createdAt = nowUtc();
  const doc = {
    ...payload,
    createdAt,
    updatedAt: createdAt,
    status: payload.status || "OPEN",
    prioritySort: parsePriorityForSort(payload.priority),
  };
  const result = await collection.insertOne(doc);
  return result.insertedId.toString();
}

export async function listQueueItems(filters: QueueFilters = {}) {
  await ensureQueueIndexes();
  const collection = await getCollection();
  const query: Record<string, unknown> = {};
  if (filters.queueType) query.queueType = filters.queueType;
  if (filters.status) query.status = filters.status;
  if (filters.assignedToUserId) query.assignedToUserId = String(filters.assignedToUserId).trim();
  if (filters.entityType) query.entityType = String(filters.entityType).trim();
  if (filters.entityId) query.entityId = String(filters.entityId).trim();
  const limit = Math.min(Math.max(Math.floor(Number(filters.limit || 50)), 1), 200);
  const rows = await collection.find(query).sort({ prioritySort: -1, slaDueAt: 1, createdAt: -1 }).limit(limit).toArray();
  return rows.map(toPublic);
}

export async function updateQueueStatus(id: string, newStatus: QueueStatus, context: QueueMutationContext) {
  if (!String(context.justification || "").trim()) throw new Error("justification is required");
  if (!String(context.actorUserId || "").trim()) throw new Error("actorUserId is required");
  if (!String(context.actorRole || "").trim()) throw new Error("actorRole is required");
  await ensureQueueIndexes();

  const collection = await getCollection();
  const _id = normalizeId(id);
  const existing = await collection.findOne({ _id });
  if (!existing) throw new Error("QUEUE_ITEM_NOT_FOUND");
  const updatedAt = nowUtc();

  await collection.updateOne({ _id }, { $set: { status: newStatus, updatedAt } });
  return null;
}

export async function assignQueueItem(id: string, userId: string, context: QueueMutationContext) {
  if (!String(context.justification || "").trim()) throw new Error("justification is required");
  if (!String(context.actorUserId || "").trim()) throw new Error("actorUserId is required");
  if (!String(context.actorRole || "").trim()) throw new Error("actorRole is required");
  if (!String(userId || "").trim()) throw new Error("assignedToUserId is required");
  await ensureQueueIndexes();

  const collection = await getCollection();
  const _id = normalizeId(id);
  const existing = await collection.findOne({ _id });
  if (!existing) throw new Error("QUEUE_ITEM_NOT_FOUND");
  const updatedAt = nowUtc();
  const assignedToUserId = String(userId).trim();

  await collection.updateOne({ _id }, { $set: { assignedToUserId, updatedAt } });
  return null;
}

export async function linkAuditToQueue(id: string, auditId: string, context: QueueMutationContext) {
  if (!String(context.justification || "").trim()) throw new Error("justification is required");
  if (!String(context.actorUserId || "").trim()) throw new Error("actorUserId is required");
  if (!String(context.actorRole || "").trim()) throw new Error("actorRole is required");
  if (!String(auditId || "").trim()) throw new Error("auditId is required");
  await ensureQueueIndexes();

  const collection = await getCollection();
  const _id = normalizeId(id);
  const existing = await collection.findOne({ _id });
  if (!existing) throw new Error("QUEUE_ITEM_NOT_FOUND");
  const updatedAt = nowUtc();
  const normalizedAuditId = String(auditId).trim();

  await collection.updateOne({ _id }, { $set: { lastActionAuditId: normalizedAuditId, updatedAt } });
}
