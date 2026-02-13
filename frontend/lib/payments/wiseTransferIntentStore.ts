import { getDb } from "../db/mongo";

export type WiseTransferIntentState =
  | "INTENT_CREATED"
  | "REQUESTED"
  | "ACCEPTED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT";

export type WiseTransferIntentRecord = {
  _id?: string;
  intentId: string;
  tenantId?: string | null;
  orderId: string;
  releaseAttemptId: string;
  attemptNumber: number;
  destinationType: string;
  wiseProfileId: string;
  idempotencyKey: string;
  wiseIdempotenceUuid: string;
  state: WiseTransferIntentState;
  autoRetryBlocked: boolean;
  transferId?: string | null;
  quoteId?: string | null;
  providerStatus?: string | null;
  providerStatusAtUtc?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  pollAttempts: number;
  maxPollAttempts: number;
  createdByRole: "admin" | "system";
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

const COLLECTION = "payment_wise_transfer_intents";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type WiseTransferIntentCollection = {
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

export type WiseTransferIntentStoreDependencies = {
  getCollection: () => Promise<WiseTransferIntentCollection>;
  now: () => Date;
};

const defaultDependencies: WiseTransferIntentStoreDependencies = {
  getCollection: async () => {
    const db = await getDb();
    return db.collection(COLLECTION) as unknown as WiseTransferIntentCollection;
  },
  now: () => new Date(),
};

let indexesReady: Promise<void> | null = null;

const ALLOWED_TRANSITIONS: Record<WiseTransferIntentState, WiseTransferIntentState[]> = {
  INTENT_CREATED: ["REQUESTED"],
  REQUESTED: ["ACCEPTED", "FAILED", "CANCELLED", "TIMED_OUT"],
  ACCEPTED: ["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
  TIMED_OUT: [],
};

function resolveDependencies(overrides: Partial<WiseTransferIntentStoreDependencies> = {}): WiseTransferIntentStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicRecord(raw: any): WiseTransferIntentRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as WiseTransferIntentRecord;
}

function assertStateTransitionAllowed(from: WiseTransferIntentState, to: WiseTransferIntentState) {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`WISE_TRANSFER_TRANSITION_INVALID:${from}->${to}`);
  }
}

export async function ensureWiseTransferIntentIndexes(
  dependencyOverrides: Partial<WiseTransferIntentStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection();
      await collection.createIndex({ intentId: 1 }, { unique: true, name: "wise_transfer_intent_intentId_unique" });
      await collection.createIndex({ idempotencyKey: 1 }, { unique: true, name: "wise_transfer_intent_idempotency_unique" });
      await collection.createIndex({ wiseIdempotenceUuid: 1 }, { unique: true, name: "wise_transfer_intent_wise_uuid_unique" });
      await collection.createIndex({ orderId: 1, createdAt: -1 }, { name: "wise_transfer_intent_order_createdAt" });
      await collection.createIndex({ transferId: 1, createdAt: -1 }, { name: "wise_transfer_intent_transfer_createdAt" });
      await collection.createIndex({ state: 1, updatedAt: -1 }, { name: "wise_transfer_intent_state_updatedAt" });
    })();
  }

  await indexesReady;
}

export async function createWiseTransferIntent(
  input: Omit<WiseTransferIntentRecord, "_id" | "state" | "autoRetryBlocked" | "pollAttempts" | "createdAt" | "updatedAt">,
  dependencyOverrides: Partial<WiseTransferIntentStoreDependencies> = {}
): Promise<WiseTransferIntentRecord> {
  await ensureWiseTransferIntentIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  if (!input.intentId) throw new Error("intentId required");
  if (!input.orderId) throw new Error("orderId required");
  if (!input.idempotencyKey) throw new Error("idempotencyKey required");
  if (!input.wiseIdempotenceUuid) throw new Error("wiseIdempotenceUuid required");
  if (!input.releaseAttemptId) throw new Error("releaseAttemptId required");

  const now = deps.now().toISOString();
  const record: WiseTransferIntentRecord = {
    intentId: input.intentId,
    tenantId: input.tenantId || null,
    orderId: input.orderId,
    releaseAttemptId: input.releaseAttemptId,
    attemptNumber: input.attemptNumber,
    destinationType: input.destinationType,
    wiseProfileId: input.wiseProfileId,
    idempotencyKey: input.idempotencyKey,
    wiseIdempotenceUuid: input.wiseIdempotenceUuid,
    state: "INTENT_CREATED",
    autoRetryBlocked: false,
    transferId: input.transferId || null,
    quoteId: input.quoteId || null,
    providerStatus: input.providerStatus || null,
    providerStatusAtUtc: input.providerStatusAtUtc || null,
    lastErrorCode: input.lastErrorCode || null,
    lastErrorMessage: input.lastErrorMessage || null,
    pollAttempts: 0,
    maxPollAttempts: input.maxPollAttempts,
    createdByRole: input.createdByRole,
    createdById: input.createdById,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const inserted = await collection.insertOne(record as any);
    return {
      ...record,
      _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await collection.findOne({ idempotencyKey: input.idempotencyKey });
      if (existing) return toPublicRecord(existing);
    }
    throw error;
  }
}

export async function getWiseTransferIntentByIdempotencyKey(
  idempotencyKey: string,
  dependencyOverrides: Partial<WiseTransferIntentStoreDependencies> = {}
): Promise<WiseTransferIntentRecord | null> {
  await ensureWiseTransferIntentIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();
  const found = await collection.findOne({ idempotencyKey });
  return found ? toPublicRecord(found) : null;
}

export async function getWiseTransferIntentByIntentId(
  intentId: string,
  dependencyOverrides: Partial<WiseTransferIntentStoreDependencies> = {}
): Promise<WiseTransferIntentRecord | null> {
  await ensureWiseTransferIntentIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();
  const found = await collection.findOne({ intentId });
  return found ? toPublicRecord(found) : null;
}

export async function getWiseTransferIntentByTransferId(
  transferId: string,
  dependencyOverrides: Partial<WiseTransferIntentStoreDependencies> = {}
): Promise<WiseTransferIntentRecord | null> {
  await ensureWiseTransferIntentIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();
  const found = await collection.findOne({ transferId });
  return found ? toPublicRecord(found) : null;
}

export async function getLatestWiseTransferIntentForOrder(
  orderId: string,
  dependencyOverrides: Partial<WiseTransferIntentStoreDependencies> = {}
): Promise<WiseTransferIntentRecord | null> {
  await ensureWiseTransferIntentIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const list = await collection.find({ orderId }).sort({ createdAt: -1 }).limit(1).toArray();
  return list.length > 0 ? toPublicRecord(list[0]) : null;
}

export async function transitionWiseTransferIntent(
  input: {
    intentId: string;
    toState: WiseTransferIntentState;
    transferId?: string | null;
    quoteId?: string | null;
    providerStatus?: string | null;
    providerStatusAtUtc?: string | null;
    lastErrorCode?: string | null;
    lastErrorMessage?: string | null;
    autoRetryBlocked?: boolean;
    incrementPollAttempts?: boolean;
  },
  dependencyOverrides: Partial<WiseTransferIntentStoreDependencies> = {}
): Promise<WiseTransferIntentRecord> {
  await ensureWiseTransferIntentIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const current = await collection.findOne({ intentId: input.intentId });
  if (!current) {
    throw new Error("WISE_TRANSFER_INTENT_NOT_FOUND");
  }

  const currentRecord = toPublicRecord(current);
  if (currentRecord.state !== input.toState) {
    assertStateTransitionAllowed(currentRecord.state, input.toState);
  }

  const updated = await collection.findOneAndUpdate(
    { intentId: input.intentId },
    {
      $set: {
        state: input.toState,
        transferId: input.transferId !== undefined ? input.transferId : currentRecord.transferId || null,
        quoteId: input.quoteId !== undefined ? input.quoteId : currentRecord.quoteId || null,
        providerStatus: input.providerStatus !== undefined ? input.providerStatus : currentRecord.providerStatus || null,
        providerStatusAtUtc:
          input.providerStatusAtUtc !== undefined
            ? input.providerStatusAtUtc
            : input.providerStatus
            ? deps.now().toISOString()
            : currentRecord.providerStatusAtUtc || null,
        lastErrorCode: input.lastErrorCode !== undefined ? input.lastErrorCode : currentRecord.lastErrorCode || null,
        lastErrorMessage:
          input.lastErrorMessage !== undefined ? input.lastErrorMessage : currentRecord.lastErrorMessage || null,
        autoRetryBlocked:
          input.autoRetryBlocked !== undefined ? input.autoRetryBlocked : currentRecord.autoRetryBlocked,
        pollAttempts: input.incrementPollAttempts ? (currentRecord.pollAttempts || 0) + 1 : currentRecord.pollAttempts || 0,
        updatedAt: deps.now().toISOString(),
      },
    },
    { returnDocument: "after" }
  );

  if (!updated) throw new Error("WISE_TRANSFER_INTENT_TRANSITION_FAILED");
  return toPublicRecord(updated);
}

export async function clearWiseTransferIntentAutoRetryBlock(
  intentId: string,
  dependencyOverrides: Partial<WiseTransferIntentStoreDependencies> = {}
): Promise<WiseTransferIntentRecord> {
  await ensureWiseTransferIntentIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const updated = await collection.findOneAndUpdate(
    { intentId },
    {
      $set: {
        autoRetryBlocked: false,
        updatedAt: deps.now().toISOString(),
      },
    },
    { returnDocument: "after" }
  );

  if (!updated) throw new Error("WISE_TRANSFER_INTENT_NOT_FOUND");
  return toPublicRecord(updated);
}

export async function listWiseTransferIntentsByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    state?: WiseTransferIntentState;
  },
  dependencyOverrides: Partial<WiseTransferIntentStoreDependencies> = {}
): Promise<WiseTransferIntentRecord[]> {
  await ensureWiseTransferIntentIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const query: Record<string, unknown> = {};
  if (params.state) query.state = params.state;

  const range: Record<string, string> = {};
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  if (fromUtc) range.$gte = fromUtc;
  if (toUtc) range.$lte = toUtc;
  if (Object.keys(range).length > 0) {
    query.updatedAt = range;
  }

  const limit = Math.min(Math.max(Number(params.limit || 500), 1), 5000);
  const docs = await collection.find(query).sort({ updatedAt: -1, createdAt: -1 }).limit(limit).toArray();
  return docs.map(toPublicRecord);
}
