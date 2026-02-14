import { getDb } from "../db/mongo";
import { assertSha256LowerHex64 } from "./hashValidation";
import { assertFinalOnlyCanonicalPayload, assertWriteOnceTransition, normalizeNullableString } from "./writeOnceGuards";

const COLLECTION = "chain_freight_settlements";

export type FreightSettlementStatus = "DRAFT" | "FINAL" | "VOID";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type FreightSettlementCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  findOneAndUpdate: (
    query: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { returnDocument?: "after" | "before"; upsert?: boolean }
  ) => Promise<any | null>;
};

export type FreightSettlementRecord = {
  _id?: string;
  settlementRecordId: string;
  orderId: string;
  paymentSnapshotHash?: string | null;
  exportManifestHash?: string | null;
  freightSettlementHash?: string | null;
  settlementVersion: string;
  settlementPayloadCanonicalJson?: string | null;
  status: FreightSettlementStatus;
  evidenceRefs?: Array<{
    type: string;
    id: string;
    hash?: string;
    path?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type FreightSettlementStoreDependencies = {
  getCollection: () => Promise<FreightSettlementCollection>;
  now: () => Date;
  randomId: () => string;
};

const defaultDependencies: FreightSettlementStoreDependencies = {
  getCollection: async () => {
    const db = await getDb();
    return db.collection(COLLECTION) as unknown as FreightSettlementCollection;
  },
  now: () => new Date(),
  randomId: () => `frset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
};

let indexesReady: Promise<void> | null = null;
const FREIGHT_SETTLEMENT_WRITE_ONCE_FIELDS = [
  "paymentSnapshotHash",
  "exportManifestHash",
  "freightSettlementHash",
] as const;

function resolveDependencies(overrides: Partial<FreightSettlementStoreDependencies> = {}): FreightSettlementStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicRecord(raw: any): FreightSettlementRecord {
  const { _id, ...rest } = raw || {};
  return {
    ...rest,
    _id: _id?.toString?.() || String(_id || ""),
  } as FreightSettlementRecord;
}

function normalizeOptionalHash(value: string | null | undefined, field: string) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return assertSha256LowerHex64(normalized, field);
}

function normalizeStatus(value: string | null | undefined): FreightSettlementStatus {
  const normalized = String(value || "DRAFT").trim().toUpperCase();
  if (normalized === "DRAFT" || normalized === "FINAL" || normalized === "VOID") {
    return normalized;
  }
  throw new Error(`FREIGHT_SETTLEMENT_INVALID_STATUS:${value}`);
}

export async function ensureFreightSettlementIndexes(
  dependencyOverrides: Partial<FreightSettlementStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection();
      await collection.createIndex({ orderId: 1 }, { name: "chain_freight_settlement_order" });
      await collection.createIndex({ paymentSnapshotHash: 1 }, { name: "chain_freight_settlement_payment_hash" });
      await collection.createIndex({ exportManifestHash: 1 }, { name: "chain_freight_settlement_export_hash" });
      await collection.createIndex({ freightSettlementHash: 1 }, { name: "chain_freight_settlement_hash" });
      await collection.createIndex({ status: 1, createdAt: -1 }, { name: "chain_freight_settlement_status_createdAt" });
      await collection.createIndex(
        { orderId: 1, settlementVersion: 1, freightSettlementHash: 1 },
        {
          unique: true,
          name: "chain_freight_settlement_order_version_hash_unique",
          partialFilterExpression: { freightSettlementHash: { $type: "string" } },
        }
      );
    })();
  }

  await indexesReady;
}

export async function createFreightSettlementRecord(
  input: {
    orderId: string;
    paymentSnapshotHash?: string | null;
    exportManifestHash?: string | null;
    freightSettlementHash?: string | null;
    settlementVersion?: string;
    settlementPayloadCanonicalJson?: string | null;
    status?: FreightSettlementStatus;
    evidenceRefs?: Array<{ type: string; id: string; hash?: string; path?: string }>;
  },
  dependencyOverrides: Partial<FreightSettlementStoreDependencies> = {}
): Promise<FreightSettlementRecord> {
  await ensureFreightSettlementIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const orderId = String(input.orderId || "").trim();
  if (!orderId) throw new Error("FREIGHT_SETTLEMENT_ORDER_ID_REQUIRED");

  const status = normalizeStatus(input.status);
  const settlementPayloadCanonicalJson = String(input.settlementPayloadCanonicalJson || "").trim() || null;
  assertFinalOnlyCanonicalPayload({
    existingPayload: null,
    nextPayload: settlementPayloadCanonicalJson,
    existingStatus: null,
    nextStatus: status,
  });

  const now = deps.now().toISOString();
  const record: FreightSettlementRecord = {
    settlementRecordId: deps.randomId(),
    orderId,
    paymentSnapshotHash: normalizeOptionalHash(input.paymentSnapshotHash, "paymentSnapshotHash"),
    exportManifestHash: normalizeOptionalHash(input.exportManifestHash, "exportManifestHash"),
    freightSettlementHash: normalizeOptionalHash(input.freightSettlementHash, "freightSettlementHash"),
    settlementVersion: String(input.settlementVersion || "v1").trim() || "v1",
    settlementPayloadCanonicalJson,
    status,
    evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [],
    createdAt: now,
    updatedAt: now,
  };

  const inserted = await collection.insertOne(record as any);
  return {
    ...record,
    _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
  };
}

export async function upsertFreightSettlementRecord(
  input: {
    orderId: string;
    settlementVersion?: string;
    paymentSnapshotHash?: string | null;
    exportManifestHash?: string | null;
    freightSettlementHash?: string | null;
    settlementPayloadCanonicalJson?: string | null;
    status?: FreightSettlementStatus;
    evidenceRefs?: Array<{ type: string; id: string; hash?: string; path?: string }>;
  },
  dependencyOverrides: Partial<FreightSettlementStoreDependencies> = {}
): Promise<FreightSettlementRecord> {
  await ensureFreightSettlementIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const orderId = String(input.orderId || "").trim();
  if (!orderId) throw new Error("FREIGHT_SETTLEMENT_ORDER_ID_REQUIRED");

  const settlementVersion = String(input.settlementVersion || "v1").trim() || "v1";
  const paymentSnapshotHash = normalizeOptionalHash(input.paymentSnapshotHash, "paymentSnapshotHash");
  const exportManifestHash = normalizeOptionalHash(input.exportManifestHash, "exportManifestHash");
  const freightSettlementHash = normalizeOptionalHash(input.freightSettlementHash, "freightSettlementHash");
  const status = normalizeStatus(input.status);
  const settlementPayloadCanonicalJson = String(input.settlementPayloadCanonicalJson || "").trim() || null;

  const query: Record<string, unknown> = { orderId, settlementVersion };

  const existing = await collection.findOne(query);
  if (existing) {
    for (const field of FREIGHT_SETTLEMENT_WRITE_ONCE_FIELDS) {
      const nextValue =
        field === "paymentSnapshotHash"
          ? paymentSnapshotHash
          : field === "exportManifestHash"
          ? exportManifestHash
          : field === "freightSettlementHash"
          ? freightSettlementHash
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

  assertFinalOnlyCanonicalPayload({
    existingPayload: existing?.settlementPayloadCanonicalJson,
    nextPayload: settlementPayloadCanonicalJson,
    existingStatus: existing?.status,
    nextStatus: status,
  });

  const now = deps.now().toISOString();
  const setFields: Record<string, unknown> = {
    orderId,
    settlementVersion,
    status,
    evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [],
    updatedAt: now,
  };
  if (normalizeNullableString(paymentSnapshotHash) !== null) {
    setFields.paymentSnapshotHash = paymentSnapshotHash;
  }
  if (normalizeNullableString(exportManifestHash) !== null) {
    setFields.exportManifestHash = exportManifestHash;
  }
  if (normalizeNullableString(freightSettlementHash) !== null) {
    setFields.freightSettlementHash = freightSettlementHash;
  }
  if (normalizeNullableString(settlementPayloadCanonicalJson) !== null) {
    setFields.settlementPayloadCanonicalJson = settlementPayloadCanonicalJson;
  }

  const updated = await collection.findOneAndUpdate(
    query,
    {
      $set: setFields,
      $setOnInsert: {
        settlementRecordId: deps.randomId(),
        createdAt: now,
      },
    },
    { returnDocument: "after", upsert: true }
  );

  if (!updated) {
    const found = await collection.findOne(query);
    if (!found) throw new Error("FREIGHT_SETTLEMENT_UPSERT_FAILED");
    return toPublicRecord(found);
  }

  return toPublicRecord(updated);
}
