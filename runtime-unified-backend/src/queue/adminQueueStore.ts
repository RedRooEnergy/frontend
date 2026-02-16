import { ObjectId } from "mongodb";
import { getDb } from "../db/mongo";

const COLLECTION = "admin_queue_items";

export type QueueStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "RESOLVED"
  | "CLOSED";

export type QueuePriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

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
  requestId?: string | null;
};

let indexesInitialized = false;

async function ensureIndexes() {
  if (indexesInitialized) return;

  const db = await getDb();
  const col = db.collection(COLLECTION);

  await col.createIndex({ queueType: 1, status: 1 });
  await col.createIndex({ status: 1, priority: -1 });
  await col.createIndex({ entityType: 1, entityId: 1 });
  await col.createIndex({ createdAt: -1 });
  await col.createIndex({ requestId: 1 }, { unique: true, sparse: true });

  indexesInitialized = true;
}

function now() {
  return new Date().toISOString();
}

export async function createQueueItem(
  item: Omit<AdminQueueItem, "_id" | "createdAt" | "updatedAt" | "status"> & {
    status?: QueueStatus;
  },
) {
  await ensureIndexes();

  const db = await getDb();
  const col = db.collection(COLLECTION);
  const ts = now();

  const doc = {
    ...item,
    status: item.status || "OPEN",
    createdAt: ts,
    updatedAt: ts,
  };

  const result = await col.insertOne(doc);
  return result.insertedId.toString();
}

export async function listQueueItems(filters: {
  queueType?: QueueType;
  status?: QueueStatus;
  assignedToUserId?: string;
  limit?: number;
} = {}) {
  await ensureIndexes();

  const db = await getDb();
  const col = db.collection(COLLECTION);

  const query: Record<string, unknown> = {};

  if (filters.queueType) query.queueType = filters.queueType;
  if (filters.status) query.status = filters.status;
  if (filters.assignedToUserId) query.assignedToUserId = filters.assignedToUserId;

  const limit = Math.min(filters.limit || 50, 200);

  const rows = await col.find(query).sort({ createdAt: -1 }).limit(limit).toArray();

  return rows.map((row) => ({
    ...row,
    _id: row._id.toString(),
  }));
}

export async function updateQueueStatus(id: string, newStatus: QueueStatus) {
  await ensureIndexes();

  const db = await getDb();
  const col = db.collection(COLLECTION);
  const _id = new ObjectId(id);

  await col.updateOne(
    { _id },
    {
      $set: {
        status: newStatus,
        updatedAt: now(),
      },
    },
  );

  return id;
}

export async function getQueueItemById(
  id: string,
): Promise<(AdminQueueItem & { _id: string }) | null> {
  await ensureIndexes();
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const _id = new ObjectId(id);
  const row = (await col.findOne({ _id })) as (AdminQueueItem & { _id: ObjectId }) | null;

  if (!row) return null;

  return {
    ...row,
    _id: row._id.toString(),
  };
}
