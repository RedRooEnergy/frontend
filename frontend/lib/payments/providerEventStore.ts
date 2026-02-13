import { getDb } from "../db/mongo";
import type { PaymentProvider, PaymentProviderEventRecord, PaymentProviderEventStatus } from "./types";

const COLLECTION = "payment_provider_events";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type ProviderEventCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  findOneAndUpdate: (
    query: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { returnDocument?: "after" | "before" }
  ) => Promise<any | null>;
  find: (query: Record<string, unknown>) => { sort: (spec: Record<string, 1 | -1>) => { limit: (value: number) => { toArray: () => Promise<any[]> } } };
};

export type ProviderEventStoreDependencies = {
  getCollection: () => Promise<ProviderEventCollection>;
  now: () => Date;
};

const defaultDependencies: ProviderEventStoreDependencies = {
  getCollection: async () => {
    const db = await getDb();
    return db.collection(COLLECTION) as unknown as ProviderEventCollection;
  },
  now: () => new Date(),
};

let indexesReady: Promise<void> | null = null;

function resolveDependencies(overrides: Partial<ProviderEventStoreDependencies> = {}): ProviderEventStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function isHexSha256(input: string) {
  return /^[a-f0-9]{64}$/i.test(input || "");
}

function toPublicRecord(raw: any): PaymentProviderEventRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as PaymentProviderEventRecord;
}

export async function ensurePaymentProviderEventIndexes(
  dependencyOverrides: Partial<ProviderEventStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection();
      await collection.createIndex(
        { provider: 1, eventId: 1 },
        { unique: true, name: "payment_provider_events_provider_eventId_unique" }
      );
      await collection.createIndex(
        { orderId: 1, createdAt: -1 },
        { name: "payment_provider_events_order_createdAt" }
      );
      await collection.createIndex(
        { provider: 1, receivedAt: -1 },
        { name: "payment_provider_events_provider_receivedAt" }
      );
      await collection.createIndex(
        { provider: 1, transferId: 1, createdAt: -1 },
        { name: "payment_provider_events_provider_transfer_createdAt" }
      );
    })();
  }

  await indexesReady;
}

export type AppendPaymentProviderEventInput = {
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  receivedAt?: string;
  occurredAt?: string | null;
  status?: PaymentProviderEventStatus;
  tenantId?: string | null;
  orderId?: string | null;
  paymentIntentId?: string | null;
  transferId?: string | null;
  payloadHashSha256?: string | null;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export async function appendPaymentProviderEvent(
  input: AppendPaymentProviderEventInput,
  dependencyOverrides: Partial<ProviderEventStoreDependencies> = {}
): Promise<{ created: boolean; event: PaymentProviderEventRecord }> {
  await ensurePaymentProviderEventIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  if (!input.provider) throw new Error("provider required");
  if (!input.eventId) throw new Error("eventId required");
  if (!input.eventType) throw new Error("eventType required");
  if (input.payloadHashSha256 && !isHexSha256(input.payloadHashSha256)) {
    throw new Error("payloadHashSha256 must be SHA-256 hex");
  }

  const now = deps.now().toISOString();
  const record: PaymentProviderEventRecord = {
    provider: input.provider,
    eventId: input.eventId,
    eventType: input.eventType,
    receivedAt: input.receivedAt || now,
    occurredAt: input.occurredAt || null,
    status: input.status || "RECEIVED",
    tenantId: input.tenantId || null,
    orderId: input.orderId || null,
    paymentIntentId: input.paymentIntentId || null,
    transferId: input.transferId || null,
    payloadHashSha256: input.payloadHashSha256 || null,
    payload: input.payload,
    metadata: input.metadata,
    errorCode: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const inserted = await collection.insertOne(record as any);
    return {
      created: true,
      event: {
        ...record,
        _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
      },
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await collection.findOne({ provider: input.provider, eventId: input.eventId });
      if (existing) return { created: false, event: toPublicRecord(existing) };
    }
    throw error;
  }
}

export async function updatePaymentProviderEventStatus(
  input: {
    provider: PaymentProvider;
    eventId: string;
    status: PaymentProviderEventStatus;
    errorCode?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
  },
  dependencyOverrides: Partial<ProviderEventStoreDependencies> = {}
): Promise<PaymentProviderEventRecord> {
  await ensurePaymentProviderEventIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const updated = await collection.findOneAndUpdate(
    {
      provider: input.provider,
      eventId: input.eventId,
    },
    {
      $set: {
        status: input.status,
        errorCode: input.errorCode || null,
        errorMessage: input.errorMessage || null,
        metadata: input.metadata,
        updatedAt: deps.now().toISOString(),
      },
    },
    { returnDocument: "after" }
  );

  if (!updated) throw new Error("PAYMENT_PROVIDER_EVENT_NOT_FOUND");
  return toPublicRecord(updated);
}

export async function listPaymentProviderEventsByOrder(
  params: {
    orderId: string;
    limit?: number;
  },
  dependencyOverrides: Partial<ProviderEventStoreDependencies> = {}
): Promise<PaymentProviderEventRecord[]> {
  await ensurePaymentProviderEventIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const limit = Math.min(Math.max(params.limit || 50, 1), 200);
  const docs = await collection.find({ orderId: params.orderId }).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map(toPublicRecord);
}

export async function listPaymentProviderEventsByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    provider?: PaymentProvider;
  },
  dependencyOverrides: Partial<ProviderEventStoreDependencies> = {}
): Promise<PaymentProviderEventRecord[]> {
  await ensurePaymentProviderEventIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const query: Record<string, unknown> = {};
  if (params.provider) query.provider = params.provider;

  const range: Record<string, string> = {};
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  if (fromUtc) range.$gte = fromUtc;
  if (toUtc) range.$lte = toUtc;
  if (Object.keys(range).length > 0) {
    query.receivedAt = range;
  }

  const limit = Math.min(Math.max(Number(params.limit || 500), 1), 5000);
  const docs = await collection.find(query).sort({ receivedAt: -1, createdAt: -1 }).limit(limit).toArray();
  return docs.map(toPublicRecord);
}
