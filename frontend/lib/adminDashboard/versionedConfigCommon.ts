import crypto from "crypto";
import { AdminAuditError } from "./auditWriter";
import { getAdminMemoryCollection } from "./memoryCollection";

type CollectionLike = {
  createIndex: (spec: Record<string, 1 | -1>, options?: Record<string, unknown>) => Promise<unknown>;
  findOne: (query: Record<string, unknown>) => Promise<Record<string, any> | null>;
  find: (query: Record<string, unknown>) => {
    sort: (spec: Record<string, 1 | -1>) => {
      limit: (value: number) => {
        next: () => Promise<Record<string, any> | null>;
      };
    };
  };
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => Promise<unknown>;
  insertOne: (doc: Record<string, unknown>) => Promise<{ insertedId?: { toString: () => string } | string }>;
};

export type VersionedConfigDependencies = {
  getCollection: (name: string) => Promise<CollectionLike>;
  now: () => Date;
};

const defaultDependencies: VersionedConfigDependencies = {
  getCollection: async (name) => {
    if (!process.env.MONGODB_URI && process.env.NODE_ENV !== "production") {
      return getAdminMemoryCollection(name) as unknown as CollectionLike;
    }
    const { getDb } = await import("../db/mongo");
    const db = await getDb();
    return db.collection(name) as unknown as CollectionLike;
  },
  now: () => new Date(),
};

export type VersionedConfigStatus = "ACTIVE" | "RETIRED";

export type VersionedConfigRecord<TRules extends Record<string, unknown>> = {
  _id?: string;
  configId: string;
  tenantId: string;
  configType: string;
  version: number;
  status: VersionedConfigStatus;
  effectiveFrom: string;
  createdAt: string;
  createdBy: { userId: string; role: string };
  reason: string;
  rules: TRules;
  canonicalHash: string;
  auditId: string;
  retiredAt?: string | null;
};

function toPublicRecord<TRules extends Record<string, unknown>>(row: Record<string, unknown>) {
  const { _id, ...rest } = row || {};
  return {
    ...rest,
    _id: _id?.toString?.() || undefined,
  } as VersionedConfigRecord<TRules>;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort((left, right) => left.localeCompare(right));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`).join(",")}}`;
}

export function canonicalHash(value: unknown) {
  return crypto.createHash("sha256").update(stableStringify(value), "utf8").digest("hex");
}

export function assertImmutableUpdateBlocked() {
  throw new AdminAuditError(
    "ADMIN_CONFIG_IMMUTABLE_VERSION",
    "Versioned configuration records are immutable; create a new version instead",
    400
  );
}

function normalizeTenantId(input?: string | null) {
  return String(input || "platform").trim() || "platform";
}

function normalizeReason(input?: string | null) {
  return String(input || "").trim();
}

function assertRequired(value: string, field: string) {
  if (!String(value || "").trim()) {
    throw new AdminAuditError("ADMIN_CONFIG_INVALID_INPUT", `${field} is required`, 400);
  }
}

export function createVersionedConfigStore<TRules extends Record<string, unknown>>(options: {
  collectionName: string;
  configType: string;
  indexPrefix: string;
}) {
  let indexesReady: Promise<void> | null = null;

  async function ensureIndexes(deps: VersionedConfigDependencies) {
    if (!indexesReady) {
      indexesReady = (async () => {
        const collection = await deps.getCollection(options.collectionName);
        await collection.createIndex(
          { tenantId: 1, version: -1 },
          { unique: true, name: `${options.indexPrefix}_tenant_version_unique` }
        );
        await collection.createIndex(
          { tenantId: 1, status: 1, effectiveFrom: -1 },
          { name: `${options.indexPrefix}_tenant_status_effectiveFrom` }
        );
        await collection.createIndex(
          { tenantId: 1, configType: 1, createdAt: -1 },
          { name: `${options.indexPrefix}_tenant_type_createdAt` }
        );
      })();
    }
    await indexesReady;
  }

  async function getActiveConfig(
    tenantId?: string | null,
    overrides: Partial<VersionedConfigDependencies> = {}
  ): Promise<VersionedConfigRecord<TRules> | null> {
    const deps: VersionedConfigDependencies = { ...defaultDependencies, ...overrides };
    await ensureIndexes(deps);
    const collection = await deps.getCollection(options.collectionName);
    const row = await collection.findOne({
      tenantId: normalizeTenantId(tenantId),
      configType: options.configType,
      status: "ACTIVE",
    });
    return row ? toPublicRecord<TRules>(row) : null;
  }

  async function createNewVersion(
    input: {
      tenantId?: string | null;
      createdBy: { userId: string; role: string };
      reason: string;
      rules: TRules;
      effectiveFrom?: string | null;
      auditId: string;
    },
    overrides: Partial<VersionedConfigDependencies> = {}
  ): Promise<VersionedConfigRecord<TRules>> {
    const deps: VersionedConfigDependencies = { ...defaultDependencies, ...overrides };
    await ensureIndexes(deps);

    assertRequired(String(input.createdBy?.userId || ""), "createdBy.userId");
    assertRequired(String(input.createdBy?.role || ""), "createdBy.role");
    const reason = normalizeReason(input.reason);
    assertRequired(reason, "reason");
    assertRequired(String(input.auditId || ""), "auditId");

    const collection = await deps.getCollection(options.collectionName);
    const tenantId = normalizeTenantId(input.tenantId);
    const nowIso = deps.now().toISOString();

    const latest = await collection
      .find({
        tenantId,
        configType: options.configType,
      })
      .sort({ version: -1 })
      .limit(1)
      .next();

    const nextVersion = Math.max(Number(latest?.version || 0), 0) + 1;
    const effectiveFrom = String(input.effectiveFrom || nowIso).trim() || nowIso;
    const configId = `${options.configType.toLowerCase()}-${tenantId}-v${nextVersion}`;
    const record: VersionedConfigRecord<TRules> = {
      configId,
      tenantId,
      configType: options.configType,
      version: nextVersion,
      status: "ACTIVE",
      effectiveFrom,
      createdAt: nowIso,
      createdBy: {
        userId: String(input.createdBy.userId).trim(),
        role: String(input.createdBy.role).trim().toLowerCase(),
      },
      reason,
      rules: input.rules,
      canonicalHash: canonicalHash({
        configType: options.configType,
        tenantId,
        version: nextVersion,
        effectiveFrom,
        rules: input.rules,
      }),
      auditId: String(input.auditId).trim(),
      retiredAt: null,
    };

    await collection.updateOne(
      {
        tenantId,
        configType: options.configType,
        status: "ACTIVE",
      },
      {
        $set: {
          status: "RETIRED",
          retiredAt: nowIso,
        },
      }
    );

    const inserted = await collection.insertOne(record as unknown as Record<string, unknown>);
    return {
      ...record,
      _id: inserted?.insertedId?.toString?.() || undefined,
    };
  }

  return {
    ensureIndexes,
    getActiveConfig,
    createNewVersion,
    updateVersion: assertImmutableUpdateBlocked,
  };
}
