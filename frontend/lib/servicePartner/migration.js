import fs from "fs/promises";
import path from "path";
import { MongoClient } from "mongodb";
import { assertNoMoneyFields } from "./noMoneyGuard";

const DATA_DIR = path.join(process.cwd(), ".data");
const SCHEDULE_COLLECTION = "service_partner_migration_schedule";
const SCHEDULE_ID = "service_partner_migration_schedule";

const SOURCES = [
  {
    file: "service-partner-compliance.json",
    collection: "service_partner_compliance_profiles",
    keyFields: ["partnerId"],
    mode: "upsert",
  },
  {
    file: "service-partner-audit.json",
    collection: "service_partner_admin_audit_logs",
    keyFields: ["id"],
    mode: "insertOnly",
  },
  {
    file: "service-partner-evidence.json",
    collection: "service_partner_evidence",
    keyFields: ["id", "evidenceId", "fileId"],
    mode: "insertOnly",
  },
  {
    file: "service-partner-documents.json",
    collection: "service_partner_documents",
    keyFields: ["id", "documentId", "fileId"],
    mode: "insertOnly",
  },
];

let cachedClient;
async function getMigrationDb() {
  if (!cachedClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is required");
    }
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
  }
  const dbName = process.env.MONGODB_DB || "rre_marketplace";
  return cachedClient.db(dbName);
}

export async function closeMigrationDb() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
  }
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getFileMeta(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      sizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    };
  } catch {
    return { sizeBytes: null, modifiedAt: null };
  }
}

function pickKey(record, keyFields) {
  for (const key of keyFields) {
    const value = record?.[key];
    if (value) return { key, value };
  }
  return null;
}

export async function previewServicePartnerSources() {
  const previews = [];
  for (const source of SOURCES) {
    const filePath = path.join(DATA_DIR, source.file);
    const exists = await fileExists(filePath);
    const data = exists ? await readJson(filePath) : null;
    const count = Array.isArray(data) ? data.length : 0;
    const meta = exists ? await getFileMeta(filePath) : { sizeBytes: null, modifiedAt: null };
    previews.push({
      file: source.file,
      collection: source.collection,
      exists,
      count,
      sizeBytes: meta.sizeBytes,
      modifiedAt: meta.modifiedAt,
    });
  }
  return previews;
}

export async function migrateServicePartnerJson({ dryRun = false, migrationId = null } = {}) {
  const db = await getMigrationDb();
  const runId = migrationId || `mig_${Date.now()}`;
  const results = [];

  for (const source of SOURCES) {
    const filePath = path.join(DATA_DIR, source.file);
    const data = await readJson(filePath);
    if (!data || !Array.isArray(data) || data.length === 0) {
      results.push({
        file: source.file,
        collection: source.collection,
        status: "SKIPPED",
        reason: "NO_DATA",
        total: 0,
        upserted: 0,
        modified: 0,
        inserted: 0,
        skipped: 0,
        missingKey: 0,
      });
      continue;
    }

    const ops = [];
    let skipped = 0;
    let missingKey = 0;

    for (const record of data) {
      if (source.collection === "service_partner_compliance_profiles") {
        assertNoMoneyFields(record, "service_partner_compliance_profile_migration");
      }
      const keyInfo = pickKey(record, source.keyFields);
      if (!keyInfo) {
        missingKey += 1;
        continue;
      }

      if (source.mode === "insertOnly") {
        ops.push({
          updateOne: {
            filter: { [keyInfo.key]: keyInfo.value },
            update: { $setOnInsert: { ...record, _migrationId: runId } },
            upsert: true,
          },
        });
      } else {
        ops.push({
          updateOne: {
            filter: { [keyInfo.key]: keyInfo.value },
            update: { $set: record, $setOnInsert: { _migrationId: runId } },
            upsert: true,
          },
        });
      }
    }

    if (dryRun) {
      results.push({
        file: source.file,
        collection: source.collection,
        status: "DRY_RUN",
        total: data.length,
        upserted: 0,
        modified: 0,
        inserted: 0,
        skipped,
        missingKey,
      });
      continue;
    }

    let upserted = 0;
    let modified = 0;
    let inserted = 0;
    if (ops.length > 0) {
      const res = await db.collection(source.collection).bulkWrite(ops, { ordered: false });
      upserted = res.upsertedCount || 0;
      modified = res.modifiedCount || 0;
      inserted = res.insertedCount || 0;
    }

    results.push({
      file: source.file,
      collection: source.collection,
      status: "MIGRATED",
      total: data.length,
      upserted,
      modified,
      inserted,
      skipped,
      missingKey,
    });
  }

  return { migrationId: runId, results };
}

export const migrationSources = SOURCES.map((s) => ({ file: s.file, collection: s.collection }));

export async function rollbackServicePartnerMigration(migrationId) {
  if (!migrationId) throw new Error("migrationId is required");
  const db = await getMigrationDb();
  const deletions = [];
  for (const source of SOURCES) {
    const res = await db.collection(source.collection).deleteMany({ _migrationId: migrationId });
    deletions.push({
      collection: source.collection,
      deleted: res.deletedCount || 0,
    });
  }
  return { migrationId, deletions };
}

export async function recordMigrationRun({
  migrationId,
  dryRun,
  mode,
  results,
  rollbackOf = null,
  actorId = null,
  actorRole = null,
  trigger = "manual",
}) {
  const db = await getMigrationDb();
  const record = {
    migrationId,
    mode,
    dryRun: Boolean(dryRun),
    rollbackOf,
    results,
    actorId,
    actorRole,
    trigger,
    createdAt: new Date(),
  };
  await db.collection("service_partner_migration_runs").insertOne(record);
  return record;
}

export async function getMigrationRunHistory({ limit = 50 } = {}) {
  const db = await getMigrationDb();
  const docs = await db
    .collection("service_partner_migration_runs")
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(({ _id, ...rest }) => rest);
}

async function ensureScheduleDocument() {
  const db = await getMigrationDb();
  const existing = await db.collection(SCHEDULE_COLLECTION).findOne({ _id: SCHEDULE_ID });
  if (existing) return existing;
  const initial = {
    _id: SCHEDULE_ID,
    enabled: false,
    intervalHours: 24,
    lastRunAt: null,
    lastResult: null,
    updatedAt: new Date(),
    updatedBy: null,
    createdAt: new Date(),
  };
  await db.collection(SCHEDULE_COLLECTION).insertOne(initial);
  return initial;
}

export async function getMigrationSchedule() {
  return ensureScheduleDocument();
}

export async function setMigrationSchedule({ enabled, intervalHours = 24, updatedBy = null } = {}) {
  const db = await getMigrationDb();
  const update = {
    enabled: Boolean(enabled),
    intervalHours: Number(intervalHours) || 24,
    updatedAt: new Date(),
    updatedBy,
  };
  const res = await db.collection(SCHEDULE_COLLECTION).findOneAndUpdate(
    { _id: SCHEDULE_ID },
    { $set: update, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, returnDocument: "after" }
  );
  return res.value || update;
}

export async function updateMigrationScheduleRun({ lastRunAt, lastResult } = {}) {
  const db = await getMigrationDb();
  const update = {
    lastRunAt: lastRunAt || new Date().toISOString(),
    lastResult: lastResult || null,
    updatedAt: new Date(),
  };
  const res = await db.collection(SCHEDULE_COLLECTION).findOneAndUpdate(
    { _id: SCHEDULE_ID },
    { $set: update, $setOnInsert: { createdAt: new Date(), enabled: true, intervalHours: 24 } },
    { upsert: true, returnDocument: "after" }
  );
  return res.value || update;
}
