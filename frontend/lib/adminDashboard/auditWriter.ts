import crypto from "crypto";

export const ADMIN_AUDIT_COLLECTION = "admin_audit_logs";

type CollectionLike = {
  insertOne: (doc: Record<string, unknown>) => Promise<{ insertedId?: { toString: () => string } | string }>;
};

type AuditDependencies = {
  getCollection: (name: string) => Promise<CollectionLike>;
  now: () => Date;
  randomUuid: () => string;
};

const defaultDependencies: AuditDependencies = {
  getCollection: async (name) => {
    const { getDb } = await import("../db/mongo");
    const db = await getDb();
    return db.collection(name) as unknown as CollectionLike;
  },
  now: () => new Date(),
  randomUuid: () => crypto.randomUUID(),
};

export type WriteAdminAuditInput = {
  actor: {
    actorId: string;
    actorRole: string;
    email?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  };
  action: string;
  entity: {
    type: string;
    id: string;
  };
  reason: string;
  before?: unknown;
  after?: unknown;
  evidence?: Array<{ type: string; refId: string; hash?: string; uri?: string }>;
  correlationId?: string | null;
  tenantId?: string | null;
};

export type AdminAuditRecord = {
  auditId: string;
  ts: string;
  actor: {
    userId: string;
    role: string;
    email?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  };
  action: string;
  entity: {
    type: string;
    id: string;
  };
  reason: string;
  beforeHash: string;
  afterHash: string;
  evidence?: Array<{ type: string; refId: string; hash?: string; uri?: string }>;
  correlationId?: string | null;
  tenantId?: string | null;
};

export class AdminAuditError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort((left, right) => left.localeCompare(right));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`).join(",")}}`;
}

export function hashCanonicalPayload(value: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(value), "utf8").digest("hex");
}

function normalizeReason(input: string): string {
  return String(input || "").trim();
}

function assertRequired(value: string, field: string) {
  if (!String(value || "").trim()) {
    throw new AdminAuditError("ADMIN_AUDIT_INVALID_INPUT", `${field} is required`);
  }
}

function buildRecord(input: WriteAdminAuditInput, deps: AuditDependencies): AdminAuditRecord {
  const reason = normalizeReason(input.reason);
  assertRequired(reason, "reason");
  assertRequired(input.action, "action");
  assertRequired(input.actor?.actorId || "", "actor.actorId");
  assertRequired(input.actor?.actorRole || "", "actor.actorRole");
  assertRequired(input.entity?.type || "", "entity.type");
  assertRequired(input.entity?.id || "", "entity.id");

  return {
    auditId: deps.randomUuid(),
    ts: deps.now().toISOString(),
    actor: {
      userId: String(input.actor.actorId).trim(),
      role: String(input.actor.actorRole).trim().toLowerCase(),
      email: input.actor.email ? String(input.actor.email).trim().toLowerCase() : null,
      ip: input.actor.ip ? String(input.actor.ip).trim() : null,
      userAgent: input.actor.userAgent ? String(input.actor.userAgent).trim() : null,
    },
    action: String(input.action).trim(),
    entity: {
      type: String(input.entity.type).trim(),
      id: String(input.entity.id).trim(),
    },
    reason,
    beforeHash: hashCanonicalPayload(input.before ?? null),
    afterHash: hashCanonicalPayload(input.after ?? null),
    evidence: input.evidence || [],
    correlationId: input.correlationId ? String(input.correlationId).trim() : null,
    tenantId: input.tenantId ? String(input.tenantId).trim() : null,
  };
}

export async function writeAdminAudit(
  input: WriteAdminAuditInput,
  overrides: Partial<AuditDependencies> = {}
): Promise<AdminAuditRecord> {
  const deps: AuditDependencies = {
    ...defaultDependencies,
    ...overrides,
  };
  const record = buildRecord(input, deps);
  const collection = await deps.getCollection(ADMIN_AUDIT_COLLECTION);
  await collection.insertOne(record);
  return record;
}
