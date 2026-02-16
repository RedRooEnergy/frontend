import crypto from "crypto";
import { getDb } from "../db/mongo";
import type { CecApprovedProductRecord, CecSyncRun } from "./types";

const PRODUCTS_COLLECTION = "cec_approved_products";
const SYNC_COLLECTION = "cec_sync_runs";

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      await db
        .collection(PRODUCTS_COLLECTION)
        .createIndex({ cecRecordId: 1 }, { unique: true, name: "cec_record_id_unique" });
      await db
        .collection(PRODUCTS_COLLECTION)
        .createIndex({ productType: 1, modelNumber: 1 }, { name: "cec_type_model" });
      await db
        .collection(PRODUCTS_COLLECTION)
        .createIndex({ manufacturerName: 1 }, { name: "cec_manufacturer" });
      await db
        .collection(PRODUCTS_COLLECTION)
        .createIndex({ approvalStatus: 1 }, { name: "cec_status" });
      await db
        .collection(PRODUCTS_COLLECTION)
        .createIndex({ lastFetchedAt: -1 }, { name: "cec_lastFetchedAt" });
      await db
        .collection(SYNC_COLLECTION)
        .createIndex({ syncId: 1 }, { unique: true, name: "cec_sync_id_unique" });
      await db
        .collection(SYNC_COLLECTION)
        .createIndex({ runAt: -1 }, { name: "cec_sync_runAt" });
    })();
  }
  await indexesReady;
}

export function computeDataHash(payload: Record<string, unknown>) {
  const normalized = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export async function upsertCecRecord(record: CecApprovedProductRecord) {
  await ensureIndexes();
  const db = await getDb();
  await db
    .collection<CecApprovedProductRecord>(PRODUCTS_COLLECTION)
    .updateOne({ cecRecordId: record.cecRecordId }, { $set: record }, { upsert: true });
}

export async function markExpired(cecRecordIds: string[]) {
  if (!cecRecordIds.length) return;
  await ensureIndexes();
  const db = await getDb();
  await db
    .collection(PRODUCTS_COLLECTION)
    .updateMany({ cecRecordId: { $in: cecRecordIds } }, { $set: { approvalStatus: "EXPIRED" } });
}

export async function listCecRecords(filters: {
  productType?: string;
  modelNumber?: string;
  manufacturerName?: string;
  approvalStatus?: string;
} = {}) {
  await ensureIndexes();
  const db = await getDb();
  const query: Record<string, unknown> = {};
  if (filters.productType) query.productType = filters.productType;
  if (filters.modelNumber) query.modelNumber = filters.modelNumber;
  if (filters.manufacturerName) query.manufacturerName = filters.manufacturerName;
  if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;

  const docs = await db.collection<CecApprovedProductRecord>(PRODUCTS_COLLECTION).find(query).toArray();
  return docs.map(({ _id, ...rest }) => rest as CecApprovedProductRecord);
}

export async function recordSyncRun(run: CecSyncRun) {
  await ensureIndexes();
  const db = await getDb();
  await db.collection<CecSyncRun>(SYNC_COLLECTION).insertOne(run);
}

export async function getLatestSyncRun(): Promise<CecSyncRun | null> {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db.collection<CecSyncRun>(SYNC_COLLECTION).find().sort({ runAt: -1 }).limit(1).next();
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return rest as CecSyncRun;
}
