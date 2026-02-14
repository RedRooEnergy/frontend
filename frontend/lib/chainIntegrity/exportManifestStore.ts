import { getDb } from "../db/mongo";
import { assertSha256LowerHex64 } from "./hashValidation";
import { assertWriteOnceTransition, normalizeNullableString } from "./writeOnceGuards";

const COLLECTION = "chain_export_manifests";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type ExportManifestCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  findOneAndUpdate: (
    query: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { returnDocument?: "after" | "before"; upsert?: boolean }
  ) => Promise<any | null>;
  find?: (query: Record<string, unknown>) => {
    sort: (spec: Record<string, 1 | -1>) => {
      limit: (value: number) => {
        toArray: () => Promise<any[]>;
      };
    };
  };
};

export type ExportManifestRecord = {
  _id?: string;
  recordId: string;
  orderId: string;
  paymentSnapshotHash?: string | null;
  exportManifestHash?: string | null;
  manifestPath?: string | null;
  generatedAt?: string | null;
  keyId?: string | null;
  signaturePresent?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExportManifestStoreDependencies = {
  getCollection: () => Promise<ExportManifestCollection>;
  now: () => Date;
  randomId: () => string;
};

const defaultDependencies: ExportManifestStoreDependencies = {
  getCollection: async () => {
    const db = await getDb();
    return db.collection(COLLECTION) as unknown as ExportManifestCollection;
  },
  now: () => new Date(),
  randomId: () => `expmf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
};

let indexesReady: Promise<void> | null = null;
const EXPORT_MANIFEST_WRITE_ONCE_FIELDS = ["paymentSnapshotHash", "exportManifestHash"] as const;

function resolveDependencies(overrides: Partial<ExportManifestStoreDependencies> = {}): ExportManifestStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicRecord(raw: any): ExportManifestRecord {
  const { _id, ...rest } = raw || {};
  return {
    ...rest,
    _id: _id?.toString?.() || String(_id || ""),
  } as ExportManifestRecord;
}

function normalizeOptionalHash(value: string | null | undefined, field: string) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return assertSha256LowerHex64(normalized, field);
}

export async function ensureExportManifestIndexes(
  dependencyOverrides: Partial<ExportManifestStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection();
      await collection.createIndex({ orderId: 1 }, { name: "chain_export_manifest_order" });
      await collection.createIndex({ paymentSnapshotHash: 1 }, { name: "chain_export_manifest_payment_hash" });
      await collection.createIndex({ exportManifestHash: 1 }, { name: "chain_export_manifest_export_hash" });
      await collection.createIndex(
        { orderId: 1, exportManifestHash: 1 },
        {
          unique: true,
          name: "chain_export_manifest_order_export_unique",
          partialFilterExpression: { exportManifestHash: { $type: "string" } },
        }
      );
    })();
  }

  await indexesReady;
}

export async function createExportManifestRecord(
  input: {
    orderId: string;
    paymentSnapshotHash?: string | null;
    exportManifestHash?: string | null;
    manifestPath?: string | null;
    generatedAt?: string | null;
    keyId?: string | null;
    signaturePresent?: boolean;
  },
  dependencyOverrides: Partial<ExportManifestStoreDependencies> = {}
): Promise<ExportManifestRecord> {
  await ensureExportManifestIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const orderId = String(input.orderId || "").trim();
  if (!orderId) throw new Error("EXPORT_MANIFEST_ORDER_ID_REQUIRED");

  const now = deps.now().toISOString();
  const record: ExportManifestRecord = {
    recordId: deps.randomId(),
    orderId,
    paymentSnapshotHash: normalizeOptionalHash(input.paymentSnapshotHash, "paymentSnapshotHash"),
    exportManifestHash: normalizeOptionalHash(input.exportManifestHash, "exportManifestHash"),
    manifestPath: String(input.manifestPath || "").trim() || null,
    generatedAt: String(input.generatedAt || "").trim() || null,
    keyId: String(input.keyId || "").trim() || null,
    signaturePresent: input.signaturePresent === true,
    createdAt: now,
    updatedAt: now,
  };

  const inserted = await collection.insertOne(record as any);
  return {
    ...record,
    _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
  };
}

export async function upsertExportManifestRecord(
  input: {
    orderId: string;
    exportManifestHash?: string | null;
    paymentSnapshotHash?: string | null;
    manifestPath?: string | null;
    generatedAt?: string | null;
    keyId?: string | null;
    signaturePresent?: boolean;
  },
  dependencyOverrides: Partial<ExportManifestStoreDependencies> = {}
): Promise<ExportManifestRecord> {
  await ensureExportManifestIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const orderId = String(input.orderId || "").trim();
  if (!orderId) throw new Error("EXPORT_MANIFEST_ORDER_ID_REQUIRED");

  const exportManifestHash = normalizeOptionalHash(input.exportManifestHash, "exportManifestHash");
  const paymentSnapshotHash = normalizeOptionalHash(input.paymentSnapshotHash, "paymentSnapshotHash");

  const now = deps.now().toISOString();
  const query: Record<string, unknown> = { orderId };

  const existing = await collection.findOne(query);
  if (existing) {
    for (const field of EXPORT_MANIFEST_WRITE_ONCE_FIELDS) {
      const nextValue =
        field === "paymentSnapshotHash"
          ? paymentSnapshotHash
          : field === "exportManifestHash"
          ? exportManifestHash
          : null;
      if (normalizeNullableString(nextValue) !== null) {
        assertWriteOnceTransition({
          existing: existing[field],
          next: nextValue,
          field,
        });
      }
    }
  }

  const setFields: Record<string, unknown> = {
    orderId,
    manifestPath: String(input.manifestPath || "").trim() || null,
    generatedAt: String(input.generatedAt || "").trim() || null,
    keyId: String(input.keyId || "").trim() || null,
    signaturePresent: input.signaturePresent === true,
    updatedAt: now,
  };
  if (normalizeNullableString(exportManifestHash) !== null) {
    setFields.exportManifestHash = exportManifestHash;
  }
  if (normalizeNullableString(paymentSnapshotHash) !== null) {
    setFields.paymentSnapshotHash = paymentSnapshotHash;
  }

  const updated = await collection.findOneAndUpdate(
    query,
    {
      $set: setFields,
      $setOnInsert: {
        recordId: deps.randomId(),
        createdAt: now,
      },
    },
    { returnDocument: "after", upsert: true }
  );

  if (!updated) {
    const found = await collection.findOne(query);
    if (!found) throw new Error("EXPORT_MANIFEST_UPSERT_FAILED");
    return toPublicRecord(found);
  }

  return toPublicRecord(updated);
}

export async function getLatestExportManifestRecordByOrderId(
  orderId: string,
  dependencyOverrides: Partial<ExportManifestStoreDependencies> = {}
): Promise<ExportManifestRecord | null> {
  await ensureExportManifestIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) return null;

  if (collection.find) {
    const rows = await collection.find({ orderId: normalizedOrderId }).sort({ generatedAt: -1, updatedAt: -1 }).limit(1).toArray();
    if (rows.length > 0) return toPublicRecord(rows[0]);
  }

  const row = await collection.findOne({ orderId: normalizedOrderId });
  return row ? toPublicRecord(row) : null;
}
