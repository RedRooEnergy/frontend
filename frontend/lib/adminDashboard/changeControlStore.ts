import crypto from "crypto";
import { getAdminMemoryCollection } from "./memoryCollection";

type CollectionLike = {
  createIndex: (spec: Record<string, 1 | -1>, options?: Record<string, unknown>) => Promise<unknown>;
  insertOne: (doc: Record<string, unknown>) => Promise<{ insertedId?: { toString: () => string } | string }>;
  find: (query: Record<string, unknown>) => {
    sort: (spec: Record<string, 1 | -1>) => {
      limit: (value: number) => {
        toArray: () => Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

type ChangeControlDependencies = {
  getCollection: (name: string) => Promise<CollectionLike>;
  now: () => Date;
  randomUuid: () => string;
};

const defaultDependencies: ChangeControlDependencies = {
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

const COLLECTION = "admin_change_control_events";
let indexesReady: Promise<void> | null = null;

export type ChangeControlStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "IMPLEMENTED";

export type ChangeControlEvent = {
  _id?: string;
  changeControlId: string;
  type: string;
  scope: {
    entityType?: string | null;
    entityId?: string | null;
  };
  rationale: string;
  reason: string;
  status: ChangeControlStatus;
  createdAt: string;
  createdBy: {
    userId: string;
    role: string;
  };
  impactAssessment: {
    riskLevel: "LOW" | "MED" | "HIGH";
    rollbackPlan: string;
    affectedParties: string[];
  };
  tenantId: string;
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
  } as ChangeControlEvent;
}

async function ensureIndexes(deps: ChangeControlDependencies) {
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection(COLLECTION);
      await collection.createIndex({ changeControlId: 1 }, { unique: true, name: "admin_change_control_id_unique" });
      await collection.createIndex({ tenantId: 1, status: 1, createdAt: -1 }, { name: "admin_change_control_tenant_status_createdAt" });
      await collection.createIndex({ tenantId: 1, type: 1, createdAt: -1 }, { name: "admin_change_control_tenant_type_createdAt" });
    })();
  }
  await indexesReady;
}

export async function createChangeControlEvent(
  input: {
    type: string;
    reason: string;
    rationale: string;
    scope?: { entityType?: string; entityId?: string } | null;
    impactAssessment?: {
      riskLevel?: "LOW" | "MED" | "HIGH";
      rollbackPlan?: string;
      affectedParties?: string[];
    } | null;
    tenantId?: string | null;
    createdBy: { userId: string; role: string };
    auditId: string;
  },
  overrides: Partial<ChangeControlDependencies> = {}
) {
  const deps: ChangeControlDependencies = { ...defaultDependencies, ...overrides };
  await ensureIndexes(deps);

  const reason = String(input.reason || "").trim();
  const rationale = String(input.rationale || "").trim();
  const type = String(input.type || "").trim().toUpperCase();
  const actorId = String(input.createdBy?.userId || "").trim();
  const actorRole = String(input.createdBy?.role || "").trim().toLowerCase();
  const auditId = String(input.auditId || "").trim();

  if (!type) throw new Error("type is required");
  if (!reason) throw new Error("reason is required");
  if (!rationale) throw new Error("rationale is required");
  if (!actorId) throw new Error("createdBy.userId is required");
  if (!actorRole) throw new Error("createdBy.role is required");
  if (!auditId) throw new Error("auditId is required");

  const nowIso = deps.now().toISOString();
  const record: ChangeControlEvent = {
    changeControlId: deps.randomUuid(),
    type,
    scope: {
      entityType: input.scope?.entityType ? String(input.scope.entityType).trim() : null,
      entityId: input.scope?.entityId ? String(input.scope.entityId).trim() : null,
    },
    rationale,
    reason,
    status: "SUBMITTED",
    createdAt: nowIso,
    createdBy: {
      userId: actorId,
      role: actorRole,
    },
    impactAssessment: {
      riskLevel: input.impactAssessment?.riskLevel || "MED",
      rollbackPlan: String(input.impactAssessment?.rollbackPlan || "").trim() || "Defined in change control execution plan",
      affectedParties: (input.impactAssessment?.affectedParties || []).map((entry) => String(entry || "").trim()).filter(Boolean),
    },
    tenantId: normalizeTenantId(input.tenantId),
    auditId,
  };

  const collection = await deps.getCollection(COLLECTION);
  const inserted = await collection.insertOne(record as unknown as Record<string, unknown>);
  return {
    ...record,
    _id: inserted?.insertedId?.toString?.() || undefined,
  };
}

export async function listChangeControlEvents(
  input: { tenantId?: string | null; limit?: number } = {},
  overrides: Partial<ChangeControlDependencies> = {}
) {
  const deps: ChangeControlDependencies = { ...defaultDependencies, ...overrides };
  await ensureIndexes(deps);
  const collection = await deps.getCollection(COLLECTION);
  const query: Record<string, unknown> = {};
  if (input.tenantId) query.tenantId = normalizeTenantId(input.tenantId);
  const limit = Math.min(Math.max(Math.floor(Number(input.limit || 50)), 1), 200);
  const rows = await collection.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
  return rows.map((row) => toPublic(row));
}
