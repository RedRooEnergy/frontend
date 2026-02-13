import { getDb } from "../db/mongo";
import type { PaymentIdempotencyRecord, PaymentIdempotencyScope, PaymentIdempotencyStatus, PaymentProvider } from "./types";

const COLLECTION = "payment_idempotency_keys";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type IdempotencyCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  findOneAndUpdate: (
    query: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { returnDocument?: "after" | "before" }
  ) => Promise<any | null>;
};

export type IdempotencyStoreDependencies = {
  getCollection: () => Promise<IdempotencyCollection>;
  now: () => Date;
};

const defaultDependencies: IdempotencyStoreDependencies = {
  getCollection: async () => {
    const db = await getDb();
    return db.collection(COLLECTION) as unknown as IdempotencyCollection;
  },
  now: () => new Date(),
};

let indexesReady: Promise<void> | null = null;

function resolveDependencies(overrides: Partial<IdempotencyStoreDependencies> = {}): IdempotencyStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function isHexSha256(input: string) {
  return /^[a-f0-9]{64}$/i.test(input || "");
}

function toPublicRecord(raw: any): PaymentIdempotencyRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as PaymentIdempotencyRecord;
}

export async function ensurePaymentIdempotencyIndexes(
  dependencyOverrides: Partial<IdempotencyStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection();
      await collection.createIndex(
        { provider: 1, scope: 1, key: 1 },
        { unique: true, name: "payment_idempotency_provider_scope_key_unique" }
      );
      await collection.createIndex(
        { status: 1, updatedAt: -1 },
        { name: "payment_idempotency_status_updatedAt" }
      );
      await collection.createIndex(
        { orderId: 1, createdAt: -1 },
        { name: "payment_idempotency_order_createdAt" }
      );
      await collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: "payment_idempotency_expiresAt_ttl" }
      );
    })();
  }

  await indexesReady;
}

export type PaymentIdempotencyPart = string | number | boolean | null | undefined;

function normalizeIdempotencyPart(part: PaymentIdempotencyPart) {
  if (part === null || part === undefined) return "";
  return String(part).trim();
}

/**
 * Deterministic serialization for payment idempotency keys.
 *
 * Format: `<len>:<value>|<len>:<value>|...` with fixed part ordering from caller.
 * The length-prefix avoids collisions like ["ab", "c"] vs ["a", "bc"].
 */
export function buildPaymentIdempotencyKey(parts: ReadonlyArray<PaymentIdempotencyPart>) {
  return parts
    .map(normalizeIdempotencyPart)
    .map((part) => `${part.length}:${part}`)
    .join("|");
}

export function buildScopedPaymentIdempotencyKey(input: {
  provider: PaymentProvider;
  scope: PaymentIdempotencyScope;
  tenantId?: string | null;
  orderId?: string | null;
  operation: string;
  referenceId?: string | null;
  attemptClass?: string | null;
  version?: string;
}) {
  const version = String(input.version || "v1").trim();
  return buildPaymentIdempotencyKey([
    version,
    input.provider,
    input.scope,
    input.tenantId || "",
    input.orderId || "",
    input.operation,
    input.referenceId || "",
    input.attemptClass || "",
  ]);
}

export type AcquirePaymentIdempotencyLockInput = {
  provider: PaymentProvider;
  scope: PaymentIdempotencyScope;
  key: string;
  operation: string;
  requestHashSha256?: string | null;
  tenantId?: string | null;
  orderId?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
};

export async function acquirePaymentIdempotencyLock(
  input: AcquirePaymentIdempotencyLockInput,
  dependencyOverrides: Partial<IdempotencyStoreDependencies> = {}
): Promise<{ acquired: boolean; record: PaymentIdempotencyRecord }> {
  await ensurePaymentIdempotencyIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  if (!input.provider) throw new Error("provider required");
  if (!input.scope) throw new Error("scope required");
  if (!input.key) throw new Error("key required");
  if (!input.operation) throw new Error("operation required");
  if (input.requestHashSha256 && !isHexSha256(input.requestHashSha256)) {
    throw new Error("requestHashSha256 must be SHA-256 hex");
  }

  const now = deps.now().toISOString();
  const record: PaymentIdempotencyRecord = {
    provider: input.provider,
    scope: input.scope,
    key: input.key,
    operation: input.operation,
    status: "IN_PROGRESS",
    requestHashSha256: input.requestHashSha256 || null,
    responseHashSha256: null,
    tenantId: input.tenantId || null,
    orderId: input.orderId || null,
    referenceId: input.referenceId || null,
    metadata: input.metadata,
    expiresAt: input.expiresAt || null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const inserted = await collection.insertOne(record as any);
    return {
      acquired: true,
      record: {
        ...record,
        _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
      },
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await collection.findOne({
        provider: input.provider,
        scope: input.scope,
        key: input.key,
      });
      if (existing) {
        return {
          acquired: false,
          record: toPublicRecord(existing),
        };
      }
    }
    throw error;
  }
}

export async function markPaymentIdempotencyResult(
  input: {
    provider: PaymentProvider;
    scope: PaymentIdempotencyScope;
    key: string;
    status: Exclude<PaymentIdempotencyStatus, "IN_PROGRESS">;
    responseHashSha256?: string | null;
    metadata?: Record<string, unknown>;
  },
  dependencyOverrides: Partial<IdempotencyStoreDependencies> = {}
): Promise<PaymentIdempotencyRecord> {
  await ensurePaymentIdempotencyIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  if (input.responseHashSha256 && !isHexSha256(input.responseHashSha256)) {
    throw new Error("responseHashSha256 must be SHA-256 hex");
  }

  const updated = await collection.findOneAndUpdate(
    {
      provider: input.provider,
      scope: input.scope,
      key: input.key,
    },
    {
      $set: {
        status: input.status,
        responseHashSha256: input.responseHashSha256 || null,
        metadata: input.metadata,
        updatedAt: deps.now().toISOString(),
      },
    },
    { returnDocument: "after" }
  );

  if (!updated) throw new Error("PAYMENT_IDEMPOTENCY_KEY_NOT_FOUND");
  return toPublicRecord(updated);
}

export async function getPaymentIdempotencyRecord(
  params: {
    provider: PaymentProvider;
    scope: PaymentIdempotencyScope;
    key: string;
  },
  dependencyOverrides: Partial<IdempotencyStoreDependencies> = {}
): Promise<PaymentIdempotencyRecord | null> {
  await ensurePaymentIdempotencyIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const found = await collection.findOne({
    provider: params.provider,
    scope: params.scope,
    key: params.key,
  });
  return found ? toPublicRecord(found) : null;
}
