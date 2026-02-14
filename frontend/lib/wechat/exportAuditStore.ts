import crypto from "crypto";
import { getDb } from "../db/mongo";

const EXPORT_AUDIT_COLLECTION = "wechat_regulator_export_audit_log";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type CollectionLike = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
};

export type WeChatExportAuditStoreDependencies = {
  getCollection: (name: string) => Promise<CollectionLike>;
  now: () => Date;
  randomUuid: () => string;
};

const defaultDependencies: WeChatExportAuditStoreDependencies = {
  getCollection: async (name) => {
    const db = await getDb();
    return db.collection(name) as unknown as CollectionLike;
  },
  now: () => new Date(),
  randomUuid: () => crypto.randomUUID(),
};

let exportAuditIndexesReady: Promise<void> | null = null;

function resolveDependencies(
  overrides: Partial<WeChatExportAuditStoreDependencies> = {}
): WeChatExportAuditStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function assertSha256Hex(value: string, field: string) {
  if (!/^[a-f0-9]{64}$/i.test(String(value || ""))) {
    throw new Error(`${field} must be a SHA-256 hex string`);
  }
}

function normalizeFormat(value: string): "zip" | "json" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "zip" || normalized === "json") return normalized;
  throw new Error(`WECHAT_EXPORT_AUDIT_INVALID_FORMAT: ${value}`);
}

function normalizeScope(input: { bindingId?: string | null; limit: number; page: number }) {
  return {
    bindingId: String(input.bindingId || "").trim() || null,
    limit: Math.min(Math.max(Math.floor(Number(input.limit || 1)), 1), 200),
    page: Math.min(Math.max(Math.floor(Number(input.page || 1)), 1), 10_000),
  };
}

export type WeChatRegulatorExportAuditEvent = {
  _id?: string;
  eventId: string;
  actorId: string;
  actorRole: "regulator";
  requestedAt: string;
  format: "zip" | "json";
  scope: {
    bindingId: string | null;
    limit: number;
    page: number;
  };
  manifestSha256: string;
  canonicalHashSha256: string;
  route: string;
  client?: {
    ipHash?: string;
    userAgentHash?: string;
  };
  retentionClass: "7Y";
  createdAt: string;
};

export async function ensureWeChatExportAuditIndexes(
  dependencyOverrides: Partial<WeChatExportAuditStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);

  if (!exportAuditIndexesReady) {
    exportAuditIndexesReady = (async () => {
      const collection = await deps.getCollection(EXPORT_AUDIT_COLLECTION);
      await collection.createIndex({ eventId: 1 }, { unique: true, name: "wechat_export_audit_event_id_unique" });
      await collection.createIndex({ requestedAt: -1 }, { name: "wechat_export_audit_requestedAt_desc" });
      await collection.createIndex({ actorId: 1, requestedAt: -1 }, { name: "wechat_export_audit_actor_requestedAt" });
      await collection.createIndex({ manifestSha256: 1 }, { name: "wechat_export_audit_manifest_sha" });
    })();
  }

  await exportAuditIndexesReady;
}

export async function appendWeChatRegulatorExportAuditEvent(
  input: {
    actorId: string;
    format: "zip" | "json";
    scope: { bindingId?: string | null; limit: number; page: number };
    manifestSha256: string;
    canonicalHashSha256: string;
    route: string;
    requestedAt?: string;
    client?: { ipHash?: string; userAgentHash?: string };
  },
  dependencyOverrides: Partial<WeChatExportAuditStoreDependencies> = {}
): Promise<WeChatRegulatorExportAuditEvent> {
  const deps = resolveDependencies(dependencyOverrides);
  await ensureWeChatExportAuditIndexes(dependencyOverrides);

  const actorId = String(input.actorId || "").trim();
  if (!actorId) throw new Error("WECHAT_EXPORT_AUDIT_INVALID_ACTOR");

  const route = String(input.route || "").trim();
  if (!route) throw new Error("WECHAT_EXPORT_AUDIT_INVALID_ROUTE");

  const requestedAt = String(input.requestedAt || deps.now().toISOString()).trim();
  if (!requestedAt) throw new Error("WECHAT_EXPORT_AUDIT_INVALID_REQUESTED_AT");

  const manifestSha256 = String(input.manifestSha256 || "").trim().toLowerCase();
  const canonicalHashSha256 = String(input.canonicalHashSha256 || "").trim().toLowerCase();
  assertSha256Hex(manifestSha256, "manifestSha256");
  assertSha256Hex(canonicalHashSha256, "canonicalHashSha256");

  const event: WeChatRegulatorExportAuditEvent = {
    eventId: deps.randomUuid(),
    actorId,
    actorRole: "regulator",
    requestedAt,
    format: normalizeFormat(input.format),
    scope: normalizeScope(input.scope),
    manifestSha256,
    canonicalHashSha256,
    route,
    client: input.client,
    retentionClass: "7Y",
    createdAt: requestedAt,
  };

  const collection = await deps.getCollection(EXPORT_AUDIT_COLLECTION);
  await collection.insertOne(event);

  return event;
}
