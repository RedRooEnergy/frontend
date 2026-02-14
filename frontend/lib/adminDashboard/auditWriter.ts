import crypto from "crypto";
import { getAdminMemoryCollection } from "./memoryCollection";

export const ADMIN_AUDIT_COLLECTION = "admin_audit_logs";

type CollectionLike = {
  insertOne: (doc: Record<string, unknown>) => Promise<{ insertedId?: { toString: () => string } | string }>;
  find: (query: Record<string, unknown>) => {
    sort: (spec: Record<string, 1 | -1>) => {
      limit: (value: number) => {
        toArray: () => Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

type AuditDependencies = {
  getCollection: (name: string) => Promise<CollectionLike>;
  now: () => Date;
  randomUuid: () => string;
};

const defaultDependencies: AuditDependencies = {
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
  integrityHash: string;
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

export function computeAuditRecordIntegrityHash(record: {
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
}) {
  return hashCanonicalPayload({
    ts: record.ts,
    actor: record.actor,
    action: record.action,
    entity: record.entity,
    reason: record.reason,
    beforeHash: record.beforeHash,
    afterHash: record.afterHash,
    evidence: record.evidence || [],
    correlationId: record.correlationId || null,
    tenantId: record.tenantId || null,
  });
}

function isSha256Hex(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
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

  const baseRecord: Omit<AdminAuditRecord, "integrityHash"> = {
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

  return {
    ...baseRecord,
    integrityHash: computeAuditRecordIntegrityHash(baseRecord),
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

export type AdminAuditIntegrityResult = {
  status: "PASS" | "FAIL";
  checkedAt: string;
  totalRecords: number;
  invalidRecords: number;
  notes: string[];
};

export async function verifyAdminAuditLogIntegrity(
  input: { limit?: number } = {},
  overrides: Partial<AuditDependencies> = {}
): Promise<AdminAuditIntegrityResult> {
  const deps: AuditDependencies = {
    ...defaultDependencies,
    ...overrides,
  };
  const limit = Math.max(1, Math.min(Math.floor(input.limit || 5000), 50_000));
  const collection = await deps.getCollection(ADMIN_AUDIT_COLLECTION);
  const rows = await collection.find({}).sort({ ts: 1 }).limit(limit).toArray();
  const notes: string[] = [];
  let invalidRecords = 0;

  rows.forEach((row, idx) => {
    const auditId = String((row as any).auditId || `row-${idx + 1}`);
    const beforeHash = (row as any).beforeHash;
    const afterHash = (row as any).afterHash;
    const integrityHash = (row as any).integrityHash;

    if (!isSha256Hex(beforeHash) || !isSha256Hex(afterHash)) {
      invalidRecords += 1;
      notes.push(`INVALID_HASH_SHAPE:${auditId}`);
      return;
    }

    const expectedIntegrityHash = computeAuditRecordIntegrityHash({
      ts: String((row as any).ts || ""),
      actor: {
        userId: String((row as any).actor?.userId || ""),
        role: String((row as any).actor?.role || ""),
        email: (row as any).actor?.email ? String((row as any).actor.email) : null,
        ip: (row as any).actor?.ip ? String((row as any).actor.ip) : null,
        userAgent: (row as any).actor?.userAgent ? String((row as any).actor.userAgent) : null,
      },
      action: String((row as any).action || ""),
      entity: {
        type: String((row as any).entity?.type || ""),
        id: String((row as any).entity?.id || ""),
      },
      reason: String((row as any).reason || ""),
      beforeHash: String(beforeHash),
      afterHash: String(afterHash),
      evidence: Array.isArray((row as any).evidence) ? (row as any).evidence : [],
      correlationId: (row as any).correlationId ? String((row as any).correlationId) : null,
      tenantId: (row as any).tenantId ? String((row as any).tenantId) : null,
    });

    if (!isSha256Hex(integrityHash) || integrityHash !== expectedIntegrityHash) {
      invalidRecords += 1;
      notes.push(`INTEGRITY_HASH_MISMATCH:${auditId}`);
    }
  });

  return {
    status: invalidRecords === 0 ? "PASS" : "FAIL",
    checkedAt: deps.now().toISOString(),
    totalRecords: rows.length,
    invalidRecords,
    notes,
  };
}
