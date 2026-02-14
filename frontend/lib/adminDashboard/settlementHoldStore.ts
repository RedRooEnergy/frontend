import crypto from "crypto";
import { getAdminMemoryCollection } from "./memoryCollection";

type CollectionLike = {
  createIndex: (spec: Record<string, 1 | -1>, options?: Record<string, unknown>) => Promise<unknown>;
  insertOne: (doc: Record<string, unknown>) => Promise<{ insertedId?: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<Record<string, any> | null>;
  find: (query: Record<string, unknown>) => {
    sort: (spec: Record<string, 1 | -1>) => {
      limit: (value: number) => {
        toArray: () => Promise<Array<Record<string, unknown>>>;
      };
    };
  };
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => Promise<{ matchedCount?: number; modifiedCount?: number }>;
};

type HoldDependencies = {
  getCollection: (name: string) => Promise<CollectionLike>;
  now: () => Date;
  randomUuid: () => string;
};

const defaultDependencies: HoldDependencies = {
  getCollection: async (name) => {
    if (!process.env.MONGODB_URI && process.env.NODE_ENV !== "production") {
      return getAdminMemoryCollection(name) as unknown as CollectionLike;
    }
    const { getDb } = await import("../db/mongo");
    const db = await getDb();
    return db.collection(name) as unknown as CollectionLike;
  },
  now: () => new Date(),
  randomUuid: () => crypto.randomUUID(),
};

const COLLECTION = "admin_settlement_holds";
let indexesReady: Promise<void> | null = null;

export type FinancialHoldSubsystem = "PAYMENTS" | "FREIGHT" | "COMPLIANCE" | "RISK";
export type FinancialHoldStatus = "ACTIVE" | "OVERRIDDEN" | "RELEASED";

export type FinancialSettlementHold = {
  _id?: string;
  holdId: string;
  tenantId: string;
  scope: {
    orderId?: string | null;
    paymentId?: string | null;
    payoutId?: string | null;
    supplierId?: string | null;
  };
  subsystem: FinancialHoldSubsystem;
  reason: string;
  reasonCode?: string | null;
  status: FinancialHoldStatus;
  createdAt: string;
  createdBy: { userId: string; role: string };
  updatedAt: string;
  override?: {
    overriddenAt: string;
    overriddenBy: { userId: string; role: string };
    justification: string;
    durationHours?: number | null;
  } | null;
  auditId: string;
};

function normalizeTenantId(input?: string | null) {
  return String(input || "platform").trim() || "platform";
}

function toPublic(row: Record<string, unknown>) {
  const { _id, ...rest } = row || {};
  return {
    ...rest,
    _id: _id?.toString?.() || undefined,
  } as FinancialSettlementHold;
}

function assertScope(scope: FinancialSettlementHold["scope"]) {
  const hasScope = Boolean(
    (scope.orderId && String(scope.orderId).trim()) ||
      (scope.paymentId && String(scope.paymentId).trim()) ||
      (scope.payoutId && String(scope.payoutId).trim()) ||
      (scope.supplierId && String(scope.supplierId).trim())
  );
  if (!hasScope) throw new Error("scope must include at least one identifier");
}

async function ensureIndexes(deps: HoldDependencies) {
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection(COLLECTION);
      await collection.createIndex({ holdId: 1 }, { unique: true, name: "admin_settlement_hold_id_unique" });
      await collection.createIndex({ tenantId: 1, status: 1, createdAt: -1 }, { name: "admin_settlement_hold_tenant_status_createdAt" });
      await collection.createIndex({ "scope.orderId": 1, status: 1 }, { name: "admin_settlement_hold_order_status" });
      await collection.createIndex({ "scope.paymentId": 1, status: 1 }, { name: "admin_settlement_hold_payment_status" });
      await collection.createIndex({ subsystem: 1, status: 1, createdAt: -1 }, { name: "admin_settlement_hold_subsystem_status_createdAt" });
    })();
  }
  await indexesReady;
}

export async function createSettlementHold(
  input: {
    tenantId?: string | null;
    scope: FinancialSettlementHold["scope"];
    subsystem: FinancialHoldSubsystem;
    reason: string;
    reasonCode?: string | null;
    createdBy: { userId: string; role: string };
    auditId: string;
  },
  overrides: Partial<HoldDependencies> = {}
) {
  const deps: HoldDependencies = { ...defaultDependencies, ...overrides };
  await ensureIndexes(deps);

  const reason = String(input.reason || "").trim();
  if (!reason) throw new Error("reason is required");
  if (!String(input.createdBy?.userId || "").trim()) throw new Error("createdBy.userId is required");
  if (!String(input.createdBy?.role || "").trim()) throw new Error("createdBy.role is required");
  if (!String(input.auditId || "").trim()) throw new Error("auditId is required");

  assertScope(input.scope || {});

  const nowIso = deps.now().toISOString();
  const record: FinancialSettlementHold = {
    holdId: deps.randomUuid(),
    tenantId: normalizeTenantId(input.tenantId),
    scope: {
      orderId: input.scope.orderId ? String(input.scope.orderId).trim() : null,
      paymentId: input.scope.paymentId ? String(input.scope.paymentId).trim() : null,
      payoutId: input.scope.payoutId ? String(input.scope.payoutId).trim() : null,
      supplierId: input.scope.supplierId ? String(input.scope.supplierId).trim() : null,
    },
    subsystem: input.subsystem,
    reason,
    reasonCode: input.reasonCode ? String(input.reasonCode).trim() : null,
    status: "ACTIVE",
    createdAt: nowIso,
    createdBy: {
      userId: String(input.createdBy.userId).trim(),
      role: String(input.createdBy.role).trim().toLowerCase(),
    },
    updatedAt: nowIso,
    override: null,
    auditId: String(input.auditId).trim(),
  };

  const collection = await deps.getCollection(COLLECTION);
  const inserted = await collection.insertOne(record as unknown as Record<string, unknown>);
  return {
    ...record,
    _id: inserted?.insertedId?.toString?.() || undefined,
  };
}

export async function getSettlementHoldById(
  holdId: string,
  overrides: Partial<HoldDependencies> = {}
): Promise<FinancialSettlementHold | null> {
  const deps: HoldDependencies = { ...defaultDependencies, ...overrides };
  await ensureIndexes(deps);
  const collection = await deps.getCollection(COLLECTION);
  const row = await collection.findOne({ holdId: String(holdId || "").trim() });
  return row ? toPublic(row) : null;
}

export async function overrideSettlementHold(
  input: {
    holdId: string;
    reason: string;
    justification: string;
    durationHours?: number | null;
    actor: { userId: string; role: string };
    auditId: string;
  },
  overrides: Partial<HoldDependencies> = {}
) {
  const deps: HoldDependencies = { ...defaultDependencies, ...overrides };
  await ensureIndexes(deps);

  const holdId = String(input.holdId || "").trim();
  if (!holdId) throw new Error("holdId is required");
  if (!String(input.reason || "").trim()) throw new Error("reason is required");
  if (!String(input.justification || "").trim()) throw new Error("justification is required");
  if (!String(input.actor?.userId || "").trim()) throw new Error("actor.userId is required");
  if (!String(input.actor?.role || "").trim()) throw new Error("actor.role is required");
  if (!String(input.auditId || "").trim()) throw new Error("auditId is required");

  const collection = await deps.getCollection(COLLECTION);
  const existing = await collection.findOne({ holdId });
  if (!existing) throw new Error("SETTLEMENT_HOLD_NOT_FOUND");

  const nowIso = deps.now().toISOString();
  await collection.updateOne(
    { holdId },
    {
      $set: {
        status: "OVERRIDDEN",
        updatedAt: nowIso,
        override: {
          overriddenAt: nowIso,
          overriddenBy: {
            userId: String(input.actor.userId).trim(),
            role: String(input.actor.role).trim().toLowerCase(),
          },
          justification: String(input.justification).trim(),
          durationHours:
            input.durationHours === undefined || input.durationHours === null
              ? null
              : Number(input.durationHours),
        },
        overrideAuditId: String(input.auditId).trim(),
      },
    }
  );

  const updated = await collection.findOne({ holdId });
  return updated ? toPublic(updated) : null;
}

export async function listSettlementHolds(
  input: {
    tenantId?: string | null;
    status?: FinancialHoldStatus;
    limit?: number;
  } = {},
  overrides: Partial<HoldDependencies> = {}
) {
  const deps: HoldDependencies = { ...defaultDependencies, ...overrides };
  await ensureIndexes(deps);
  const collection = await deps.getCollection(COLLECTION);
  const query: Record<string, unknown> = {};
  if (input.tenantId) query.tenantId = normalizeTenantId(input.tenantId);
  if (input.status) query.status = input.status;
  const limit = Math.min(Math.max(Math.floor(Number(input.limit || 50)), 1), 200);
  const rows = await collection.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
  return rows.map((row) => toPublic(row));
}
