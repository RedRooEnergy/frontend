import { getDb } from "../db/mongo";

export type CecSyncSchedule = {
  _id?: string;
  enabled: boolean;
  intervalHours: number;
  lastRunAt?: string | null;
  lastResult?: { syncId?: string; failed?: boolean } | null;
  updatedAt?: string;
  updatedBy?: string | null;
  createdAt?: string;
};

const SCHEDULE_COLLECTION = "cec_sync_schedule";
const SCHEDULE_ID = "cec_sync_schedule";

async function ensureScheduleDocument(): Promise<CecSyncSchedule> {
  const db = await getDb();
  const collection = db.collection<CecSyncSchedule>(SCHEDULE_COLLECTION);
  const existing = await collection.findOne({ _id: SCHEDULE_ID });
  if (existing) return existing as CecSyncSchedule;
  const initial: CecSyncSchedule = {
    _id: SCHEDULE_ID,
    enabled: false,
    intervalHours: 24,
    lastRunAt: null,
    lastResult: null,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
    createdAt: new Date().toISOString(),
  };
  await collection.insertOne(initial);
  return initial;
}

export async function getCecSyncSchedule(): Promise<CecSyncSchedule> {
  return ensureScheduleDocument();
}

export async function setCecSyncSchedule({
  enabled,
  intervalHours = 24,
  updatedBy = null,
}: {
  enabled?: boolean;
  intervalHours?: number;
  updatedBy?: string | null;
} = {}): Promise<CecSyncSchedule> {
  const db = await getDb();
  const collection = db.collection<CecSyncSchedule>(SCHEDULE_COLLECTION);
  const update = {
    enabled: Boolean(enabled),
    intervalHours: Number(intervalHours) || 24,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await collection.findOneAndUpdate(
    { _id: SCHEDULE_ID },
    { $set: update, $setOnInsert: { createdAt: new Date().toISOString() } },
    { upsert: true, returnDocument: "after" }
  );
  const refreshed = await collection.findOne({ _id: SCHEDULE_ID });
  return (refreshed as CecSyncSchedule) || ({ ...update } as CecSyncSchedule);
}

export async function updateCecSyncScheduleRun({
  lastRunAt,
  lastResult,
}: {
  lastRunAt?: string;
  lastResult?: { syncId?: string; failed?: boolean } | null;
} = {}): Promise<CecSyncSchedule> {
  const db = await getDb();
  const collection = db.collection<CecSyncSchedule>(SCHEDULE_COLLECTION);
  const update = {
    lastRunAt: lastRunAt || new Date().toISOString(),
    lastResult: lastResult || null,
    updatedAt: new Date().toISOString(),
  };
  await collection.findOneAndUpdate(
    { _id: SCHEDULE_ID },
    { $set: update, $setOnInsert: { createdAt: new Date().toISOString(), enabled: true, intervalHours: 24 } },
    { upsert: true, returnDocument: "after" }
  );
  const refreshed = await collection.findOne({ _id: SCHEDULE_ID });
  return (refreshed as CecSyncSchedule) || ({ ...update } as CecSyncSchedule);
}
