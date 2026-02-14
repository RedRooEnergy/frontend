import crypto from "crypto";
import { getDb } from "../db/mongo";
import {
  buildDeterministicId,
  buildDeterministicIdempotencyKey,
  canonicalPayloadHash,
  sha256Hex,
  stableStringify,
} from "./hash";
import type {
  WeChatAuditAttestationRecord,
  WeChatBindingAuditEntry,
  WeChatBindingStatus,
  WeChatChannelBindingRecord,
  WeChatDispatchRecord,
  WeChatDispatchStatusEventRecord,
  WeChatDispatchStatusEventType,
  WeChatEntityType,
  WeChatInboundMessageRecord,
  WeChatTemplateRegistryRecord,
  WeChatVerificationMethod,
} from "./types";

const BINDING_COLLECTION = "wechat_channel_bindings";
const TEMPLATE_COLLECTION = "wechat_template_registry";
const DISPATCH_COLLECTION = "wechat_dispatch_records";
const DISPATCH_STATUS_COLLECTION = "wechat_dispatch_status_events";
const INBOUND_COLLECTION = "wechat_inbound_message_records";
const ATTESTATION_COLLECTION = "wechat_audit_attestations";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type FindCursor = {
  sort: (spec: Record<string, 1 | -1>) => {
    skip: (value: number) => {
      limit: (value: number) => {
        toArray: () => Promise<any[]>;
      };
    };
    limit: (value: number) => {
      toArray: () => Promise<any[]>;
    };
    toArray: () => Promise<any[]>;
  };
  toArray: () => Promise<any[]>;
};

type CollectionLike = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  updateOne: (query: Record<string, unknown>, update: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  findOne: (query: Record<string, unknown>, options?: Record<string, unknown>) => Promise<any | null>;
  find: (query: Record<string, unknown>) => FindCursor;
  countDocuments: (query: Record<string, unknown>) => Promise<number>;
};

export type WeChatStoreDependencies = {
  getCollection: (name: string) => Promise<CollectionLike>;
  now: () => Date;
  randomBytes: (size: number) => Buffer;
};

const defaultDependencies: WeChatStoreDependencies = {
  getCollection: async (name) => {
    const db = await getDb();
    return db.collection(name) as unknown as CollectionLike;
  },
  now: () => new Date(),
  randomBytes: (size) => crypto.randomBytes(size),
};

let indexesReady: Promise<void> | null = null;

function resolveDependencies(overrides: Partial<WeChatStoreDependencies> = {}): WeChatStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicRecord<T>(raw: any): T {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as T;
}

export function maskId(id: string) {
  const normalized = String(id || "").trim();
  if (!normalized) return "";
  return `****${normalized.slice(-4)}`;
}

function normalizeEntityType(value: string): WeChatEntityType {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "SUPPLIER" || normalized === "BUYER" || normalized === "ADMIN") {
    return normalized;
  }
  throw new Error(`WECHAT_GOVERNANCE_VIOLATION: invalid entityType \"${value}\"`);
}

function normalizeBindingStatus(value: string): WeChatBindingStatus {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "PENDING" || normalized === "VERIFIED" || normalized === "SUSPENDED" || normalized === "REVOKED") {
    return normalized;
  }
  throw new Error(`WECHAT_GOVERNANCE_VIOLATION: invalid binding status \"${value}\"`);
}

function normalizeVerificationMethod(value: string): WeChatVerificationMethod {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "QR_LINK" || normalized === "OAUTH" || normalized === "MANUAL_REVIEW") {
    return normalized;
  }
  throw new Error(`WECHAT_GOVERNANCE_VIOLATION: invalid verification method \"${value}\"`);
}

function buildBindingId(input: { entityType: WeChatEntityType; entityId: string; wechatAppId: string }) {
  const payloadHash = canonicalPayloadHash({
    entityType: input.entityType,
    entityId: input.entityId,
    wechatAppId: input.wechatAppId,
  });

  return buildDeterministicId({
    artifactClass: "wechat_binding",
    primaryKeyFields: [input.entityType, input.entityId, input.wechatAppId],
    canonicalPayloadHash: payloadHash,
  });
}

function buildDispatchStatusEventId(input: {
  dispatchId: string;
  eventType: WeChatDispatchStatusEventType;
  providerStatus: string;
  providerRequestId?: string | null;
  providerErrorCode?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const payloadHash = canonicalPayloadHash({
    dispatchId: input.dispatchId,
    eventType: input.eventType,
    providerStatus: input.providerStatus,
    providerRequestId: input.providerRequestId || null,
    providerErrorCode: input.providerErrorCode || null,
    metadata: input.metadata || null,
  });

  return buildDeterministicId({
    artifactClass: "wechat_dispatch_status_event",
    primaryKeyFields: [input.dispatchId, input.eventType, input.providerStatus, input.providerRequestId || "", input.providerErrorCode || ""],
    canonicalPayloadHash: payloadHash,
  });
}

function buildInboundId(input: {
  recipientBindingId?: string | null;
  inboundPayloadHashSha256: string;
  receivedAt: string;
}) {
  const payloadHash = canonicalPayloadHash({
    recipientBindingId: input.recipientBindingId || null,
    inboundPayloadHashSha256: input.inboundPayloadHashSha256,
    receivedAt: input.receivedAt,
  });

  return buildDeterministicId({
    artifactClass: "wechat_inbound_message",
    primaryKeyFields: [input.recipientBindingId || "", input.receivedAt],
    canonicalPayloadHash: payloadHash,
  });
}

function buildAuditEntry(input: {
  actorRole: "system" | "supplier" | "admin";
  actorId: string;
  action: WeChatBindingAuditEntry["action"];
  reason: string;
  metadata?: Record<string, unknown>;
  nowIso: string;
}) {
  const payloadHash = canonicalPayloadHash({
    actorRole: input.actorRole,
    actorId: input.actorId,
    action: input.action,
    reason: input.reason,
    metadata: input.metadata || null,
    at: input.nowIso,
  });

  return {
    auditId: buildDeterministicId({
      artifactClass: "wechat_binding_audit_entry",
      primaryKeyFields: [input.actorRole, input.actorId, input.action, input.nowIso],
      canonicalPayloadHash: payloadHash,
    }),
    actorRole: input.actorRole,
    actorId: input.actorId,
    action: input.action,
    reason: input.reason,
    metadata: input.metadata,
    createdAt: input.nowIso,
  } as WeChatBindingAuditEntry;
}

export async function ensureWeChatIndexes(
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);

  if (!indexesReady) {
    indexesReady = (async () => {
      const bindings = await deps.getCollection(BINDING_COLLECTION);
      await bindings.createIndex({ bindingId: 1 }, { unique: true, name: "wechat_binding_id_unique" });
      await bindings.createIndex(
        { entityType: 1, entityId: 1, wechatAppId: 1 },
        { unique: true, name: "wechat_binding_entity_app_unique" }
      );
      await bindings.createIndex({ status: 1, updatedAt: -1 }, { name: "wechat_binding_status_updatedAt" });
      await bindings.createIndex({ wechatUserId: 1 }, { name: "wechat_binding_wechatUserId" });
      await bindings.createIndex(
        { verificationTokenHashSha256: 1, verificationTokenExpiresAt: -1 },
        { name: "wechat_binding_verification_token" }
      );

      const templates = await deps.getCollection(TEMPLATE_COLLECTION);
      await templates.createIndex(
        { eventCode: 1, language: 1, schemaVersion: 1 },
        { unique: true, name: "wechat_template_event_lang_schema_unique" }
      );
      await templates.createIndex({ templateKey: 1, schemaVersion: 1 }, { name: "wechat_template_key_schema" });
      await templates.createIndex({ eventCode: 1, status: 1 }, { name: "wechat_template_event_status" });

      const dispatches = await deps.getCollection(DISPATCH_COLLECTION);
      await dispatches.createIndex({ dispatchId: 1 }, { unique: true, name: "wechat_dispatch_id_unique" });
      await dispatches.createIndex({ idempotencyKey: 1 }, { unique: true, name: "wechat_dispatch_idempotency_unique" });
      await dispatches.createIndex({ eventCode: 1, createdAt: -1 }, { name: "wechat_dispatch_event_createdAt" });
      await dispatches.createIndex({ recipientBindingId: 1, createdAt: -1 }, { name: "wechat_dispatch_binding_createdAt" });
      await dispatches.createIndex({ "correlation.orderId": 1, createdAt: -1 }, { name: "wechat_dispatch_order_createdAt" });
      await dispatches.createIndex({ "correlation.shipmentId": 1, createdAt: -1 }, { name: "wechat_dispatch_shipment_createdAt" });
      await dispatches.createIndex({ "correlation.paymentId": 1, createdAt: -1 }, { name: "wechat_dispatch_payment_createdAt" });
      await dispatches.createIndex(
        { "correlation.complianceCaseId": 1, createdAt: -1 },
        { name: "wechat_dispatch_complianceCase_createdAt" }
      );

      const statusEvents = await deps.getCollection(DISPATCH_STATUS_COLLECTION);
      await statusEvents.createIndex({ statusEventId: 1 }, { unique: true, name: "wechat_dispatch_status_event_id_unique" });
      await statusEvents.createIndex({ dispatchId: 1, createdAt: -1 }, { name: "wechat_dispatch_status_dispatch_createdAt" });
      await statusEvents.createIndex(
        { providerStatus: 1, createdAt: -1 },
        { name: "wechat_dispatch_status_providerStatus_createdAt" }
      );

      const inbound = await deps.getCollection(INBOUND_COLLECTION);
      await inbound.createIndex({ inboundId: 1 }, { unique: true, name: "wechat_inbound_id_unique" });
      await inbound.createIndex({ inboundPayloadHashSha256: 1 }, { name: "wechat_inbound_payload_hash" });
      await inbound.createIndex({ recipientBindingId: 1, receivedAt: -1 }, { name: "wechat_inbound_binding_receivedAt" });
      await inbound.createIndex({ receivedAt: -1 }, { name: "wechat_inbound_receivedAt" });

      const attestations = await deps.getCollection(ATTESTATION_COLLECTION);
      await attestations.createIndex({ runId: 1 }, { unique: true, name: "wechat_attestation_runId_unique" });
      await attestations.createIndex({ createdAt: -1 }, { name: "wechat_attestation_createdAt" });
    })();
  }

  await indexesReady;
}

export async function listWeChatTemplateRegistry(
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
) {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const templates = await deps.getCollection(TEMPLATE_COLLECTION);
  const rows = await templates.find({}).sort({ eventCode: 1, language: 1, createdAt: -1 }).toArray();
  return rows.map((row) => toPublicRecord<WeChatTemplateRegistryRecord>(row));
}

export async function upsertWeChatTemplateRegistry(
  input: {
    eventCode: string;
    templateKey: string;
    wechatTemplateId: string;
    language: "en-AU" | "zh-CN";
    schemaVersion: string;
    requiredPlaceholders: string[];
    allowedLinks: string[];
    status: "DRAFT" | "LOCKED";
    renderTemplate: string;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
) {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const templates = await deps.getCollection(TEMPLATE_COLLECTION);

  const normalized = {
    eventCode: String(input.eventCode || "").trim(),
    templateKey: String(input.templateKey || "").trim(),
    wechatTemplateId: String(input.wechatTemplateId || "").trim(),
    language: input.language,
    schemaVersion: String(input.schemaVersion || "v1").trim(),
    requiredPlaceholders: [...new Set((input.requiredPlaceholders || []).map((item) => String(item || "").trim()).filter(Boolean))].sort(
      (left, right) => left.localeCompare(right)
    ),
    allowedLinks: [...new Set((input.allowedLinks || []).map((item) => String(item || "").trim()).filter(Boolean))].sort(
      (left, right) => left.localeCompare(right)
    ),
    status: input.status,
    renderTemplate: String(input.renderTemplate || "").trim(),
  };

  const hashOfTemplateContractSha256 = canonicalPayloadHash({
    eventCode: normalized.eventCode,
    templateKey: normalized.templateKey,
    wechatTemplateId: normalized.wechatTemplateId,
    language: normalized.language,
    schemaVersion: normalized.schemaVersion,
    requiredPlaceholders: normalized.requiredPlaceholders,
    allowedLinks: normalized.allowedLinks,
    renderTemplate: normalized.renderTemplate,
  });

  const nowIso = deps.now().toISOString();
  const record: WeChatTemplateRegistryRecord = {
    ...normalized,
    hashOfTemplateContractSha256,
    createdAt: nowIso,
  };

  await templates.updateOne(
    {
      eventCode: normalized.eventCode,
      language: normalized.language,
      schemaVersion: normalized.schemaVersion,
    },
    {
      $set: record,
    },
    { upsert: true }
  );

  const saved = await templates.findOne({
    eventCode: normalized.eventCode,
    language: normalized.language,
    schemaVersion: normalized.schemaVersion,
  });

  return saved ? toPublicRecord<WeChatTemplateRegistryRecord>(saved) : record;
}

export async function getWeChatTemplateRegistryEntry(
  params: { eventCode: string; language: "en-AU" | "zh-CN" },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<WeChatTemplateRegistryRecord | null> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const templates = await deps.getCollection(TEMPLATE_COLLECTION);

  const locked = await templates.findOne({
    eventCode: params.eventCode,
    language: params.language,
    status: "LOCKED",
  });

  if (locked) return toPublicRecord<WeChatTemplateRegistryRecord>(locked);

  const fallback = await templates.findOne({
    eventCode: params.eventCode,
    language: params.language,
  });

  return fallback ? toPublicRecord<WeChatTemplateRegistryRecord>(fallback) : null;
}

export async function getWeChatBindingById(
  bindingId: string,
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<WeChatChannelBindingRecord | null> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const bindings = await deps.getCollection(BINDING_COLLECTION);

  const row = await bindings.findOne({ bindingId: String(bindingId || "").trim() });
  return row ? toPublicRecord<WeChatChannelBindingRecord>(row) : null;
}

export async function getWeChatBindingForEntity(
  params: {
    entityType: WeChatEntityType;
    entityId: string;
    wechatAppId: string;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<WeChatChannelBindingRecord | null> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const bindings = await deps.getCollection(BINDING_COLLECTION);

  const row = await bindings.findOne({
    entityType: normalizeEntityType(params.entityType),
    entityId: String(params.entityId || "").trim(),
    wechatAppId: String(params.wechatAppId || "").trim(),
  });

  return row ? toPublicRecord<WeChatChannelBindingRecord>(row) : null;
}

export async function getWeChatBindingByWeChatUserId(
  params: {
    wechatUserId: string;
    wechatAppId?: string;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<WeChatChannelBindingRecord | null> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const bindings = await deps.getCollection(BINDING_COLLECTION);

  const query: Record<string, unknown> = {
    wechatUserId: String(params.wechatUserId || "").trim(),
  };
  if (params.wechatAppId) query.wechatAppId = String(params.wechatAppId || "").trim();

  const row = await bindings.findOne(query);
  return row ? toPublicRecord<WeChatChannelBindingRecord>(row) : null;
}

export async function listWeChatBindings(
  params: {
    entityType?: WeChatEntityType;
    entityId?: string;
    status?: WeChatBindingStatus;
    wechatAppId?: string;
    limit?: number;
    page?: number;
  } = {},
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{ items: WeChatChannelBindingRecord[]; total: number; page: number; limit: number }> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const bindings = await deps.getCollection(BINDING_COLLECTION);

  const query: Record<string, unknown> = {};
  if (params.entityType) query.entityType = normalizeEntityType(params.entityType);
  if (params.entityId) query.entityId = String(params.entityId).trim();
  if (params.status) query.status = normalizeBindingStatus(params.status);
  if (params.wechatAppId) query.wechatAppId = String(params.wechatAppId).trim();

  const limit = Math.min(Math.max(Number(params.limit || 50), 1), 200);
  const page = Math.max(Number(params.page || 1), 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    bindings.find(query).sort({ updatedAt: -1, bindingId: 1 }).skip(skip).limit(limit).toArray(),
    bindings.countDocuments(query),
  ]);

  return {
    items: items.map((row) => toPublicRecord<WeChatChannelBindingRecord>(row)),
    total,
    page,
    limit,
  };
}

export async function listWeChatLedgerSliceForRegulator(
  params: {
    bindingId?: string;
    limit?: number;
    page?: number;
  } = {},
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{
  items: Array<{
    bindingIdMasked: string;
    status: WeChatBindingStatus;
    createdAt: string;
    entityType: WeChatEntityType;
    entityHash: string;
  }>;
  total: number;
  page: number;
  limit: number;
}> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const bindings = await deps.getCollection(BINDING_COLLECTION);

  const query: Record<string, unknown> = {};
  if (params.bindingId) query.bindingId = String(params.bindingId || "").trim();

  const limit = Math.min(Math.max(Number(params.limit || 50), 1), 200);
  const page = Math.max(Number(params.page || 1), 1);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    bindings.find(query).sort({ createdAt: -1, bindingId: 1 }).skip(skip).limit(limit).toArray(),
    bindings.countDocuments(query),
  ]);

  return {
    items: rows.map((row) => {
      const publicRow = toPublicRecord<WeChatChannelBindingRecord>(row);
      const entityHash = sha256Hex(stableStringify({ entityType: publicRow.entityType, entityId: publicRow.entityId }));
      return {
        bindingIdMasked: maskId(publicRow.bindingId),
        status: publicRow.status,
        createdAt: publicRow.createdAt,
        entityType: publicRow.entityType,
        entityHash,
      };
    }),
    total,
    page,
    limit,
  };
}

export async function upsertWeChatBindingStart(
  input: {
    entityType: WeChatEntityType;
    entityId: string;
    wechatAppId: string;
    verificationMethod: WeChatVerificationMethod;
    actorRole: "system" | "supplier" | "admin";
    actorId: string;
    reason: string;
    verificationTokenTtlMinutes: number;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{
  binding: WeChatChannelBindingRecord;
  verificationToken: string;
  verificationTokenHashSha256: string;
}> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const bindings = await deps.getCollection(BINDING_COLLECTION);

  const entityType = normalizeEntityType(input.entityType);
  const entityId = String(input.entityId || "").trim();
  const wechatAppId = String(input.wechatAppId || "").trim();
  const verificationMethod = normalizeVerificationMethod(input.verificationMethod);

  if (!entityId) throw new Error("WECHAT_GOVERNANCE_VIOLATION: entityId required");
  if (!wechatAppId) throw new Error("WECHAT_GOVERNANCE_VIOLATION: wechatAppId required");

  const nowIso = deps.now().toISOString();
  const token = deps.randomBytes(24).toString("hex");
  const verificationTokenHashSha256 = sha256Hex(token);
  const expiresAt = new Date(Date.parse(nowIso) + Math.max(1, input.verificationTokenTtlMinutes) * 60 * 1000).toISOString();

  const bindingId = buildBindingId({ entityType, entityId, wechatAppId });
  const existing = await bindings.findOne({ bindingId });

  const auditEntry = buildAuditEntry({
    actorRole: input.actorRole,
    actorId: String(input.actorId || "").trim() || "system",
    action: existing ? "BINDING_START_REISSUED" : "BINDING_CREATED",
    reason: input.reason,
    metadata: {
      verificationMethod,
      expiresAt,
    },
    nowIso,
  });

  if (!existing) {
    const record: WeChatChannelBindingRecord = {
      bindingId,
      entityType,
      entityId,
      wechatAppId,
      wechatUserId: null,
      officialAccountFollowerId: null,
      status: "PENDING",
      verificationMethod,
      verificationTokenHashSha256,
      verificationTokenExpiresAt: expiresAt,
      verifiedAt: null,
      revokedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      audit: [auditEntry],
    };

    await bindings.insertOne(record as any);
    return {
      binding: record,
      verificationToken: token,
      verificationTokenHashSha256,
    };
  }

  const nextAudit = [...((existing.audit as WeChatBindingAuditEntry[] | undefined) || []), auditEntry];
  const nextStatus = existing.status === "REVOKED" ? "PENDING" : (existing.status as WeChatBindingStatus);

  await bindings.updateOne(
    { bindingId },
    {
      $set: {
        status: nextStatus,
        verificationMethod,
        verificationTokenHashSha256,
        verificationTokenExpiresAt: expiresAt,
        updatedAt: nowIso,
        audit: nextAudit,
      },
    }
  );

  const saved = await bindings.findOne({ bindingId });
  return {
    binding: saved ? toPublicRecord<WeChatChannelBindingRecord>(saved) : toPublicRecord<WeChatChannelBindingRecord>(existing),
    verificationToken: token,
    verificationTokenHashSha256,
  };
}

export async function verifyWeChatBindingByToken(
  input: {
    bindingId: string;
    verificationToken: string;
    wechatUserId: string;
    officialAccountFollowerId?: string | null;
    actorRole: "system" | "supplier" | "admin";
    actorId: string;
    reason: string;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{ updated: boolean; binding: WeChatChannelBindingRecord | null; code: string }> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const bindings = await deps.getCollection(BINDING_COLLECTION);

  const bindingId = String(input.bindingId || "").trim();
  const tokenHash = sha256Hex(String(input.verificationToken || ""));
  const nowIso = deps.now().toISOString();

  const row = await bindings.findOne({ bindingId });
  if (!row) {
    return { updated: false, binding: null, code: "WECHAT_BINDING_NOT_FOUND" };
  }

  const existing = toPublicRecord<WeChatChannelBindingRecord>(row);
  if (existing.status === "SUSPENDED" || existing.status === "REVOKED") {
    return { updated: false, binding: existing, code: "WECHAT_BINDING_NOT_WRITABLE" };
  }

  if (!existing.verificationTokenHashSha256 || existing.verificationTokenHashSha256 !== tokenHash) {
    return { updated: false, binding: existing, code: "WECHAT_BINDING_TOKEN_INVALID" };
  }

  if (!existing.verificationTokenExpiresAt || Date.parse(existing.verificationTokenExpiresAt) < Date.parse(nowIso)) {
    return { updated: false, binding: existing, code: "WECHAT_BINDING_TOKEN_EXPIRED" };
  }

  const auditEntry = buildAuditEntry({
    actorRole: input.actorRole,
    actorId: String(input.actorId || "").trim() || "system",
    action: "BINDING_VERIFIED",
    reason: input.reason,
    metadata: {
      wechatUserId: String(input.wechatUserId || "").trim(),
      officialAccountFollowerId: String(input.officialAccountFollowerId || "").trim() || null,
    },
    nowIso,
  });

  const nextAudit = [...(existing.audit || []), auditEntry];

  await bindings.updateOne(
    { bindingId },
    {
      $set: {
        status: "VERIFIED",
        wechatUserId: String(input.wechatUserId || "").trim(),
        officialAccountFollowerId: String(input.officialAccountFollowerId || "").trim() || null,
        verifiedAt: nowIso,
        verificationTokenHashSha256: null,
        verificationTokenExpiresAt: null,
        updatedAt: nowIso,
        audit: nextAudit,
      },
    }
  );

  const saved = await bindings.findOne({ bindingId });
  return {
    updated: true,
    binding: saved ? toPublicRecord<WeChatChannelBindingRecord>(saved) : existing,
    code: "WECHAT_BINDING_VERIFIED",
  };
}

async function updateBindingStatusWithAudit(
  input: {
    bindingId: string;
    status: "SUSPENDED" | "REVOKED";
    actorId: string;
    actorRole: "admin" | "system";
    reason: string;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<WeChatChannelBindingRecord | null> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const bindings = await deps.getCollection(BINDING_COLLECTION);

  const bindingId = String(input.bindingId || "").trim();
  const row = await bindings.findOne({ bindingId });
  if (!row) return null;

  const existing = toPublicRecord<WeChatChannelBindingRecord>(row);
  const nowIso = deps.now().toISOString();
  const auditEntry = buildAuditEntry({
    actorRole: input.actorRole,
    actorId: String(input.actorId || "").trim() || "system",
    action: input.status === "SUSPENDED" ? "BINDING_SUSPENDED" : "BINDING_REVOKED",
    reason: input.reason,
    nowIso,
  });

  const nextAudit = [...(existing.audit || []), auditEntry];

  await bindings.updateOne(
    { bindingId },
    {
      $set: {
        status: input.status,
        revokedAt: input.status === "REVOKED" ? nowIso : existing.revokedAt || null,
        updatedAt: nowIso,
        audit: nextAudit,
      },
    }
  );

  const saved = await bindings.findOne({ bindingId });
  return saved ? toPublicRecord<WeChatChannelBindingRecord>(saved) : existing;
}

export async function suspendWeChatBinding(
  input: { bindingId: string; actorId: string; actorRole: "admin" | "system"; reason: string },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
) {
  return updateBindingStatusWithAudit(
    {
      ...input,
      status: "SUSPENDED",
    },
    dependencyOverrides
  );
}

export async function revokeWeChatBinding(
  input: { bindingId: string; actorId: string; actorRole: "admin" | "system"; reason: string },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
) {
  return updateBindingStatusWithAudit(
    {
      ...input,
      status: "REVOKED",
    },
    dependencyOverrides
  );
}

export async function createWeChatDispatchRecord(
  input: WeChatDispatchRecord,
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{ created: boolean; record: WeChatDispatchRecord }> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const dispatches = await deps.getCollection(DISPATCH_COLLECTION);

  try {
    const inserted = await dispatches.insertOne(input as any);
    return {
      created: true,
      record: {
        ...input,
        _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
      },
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing =
        (await dispatches.findOne({ dispatchId: input.dispatchId })) ||
        (await dispatches.findOne({ idempotencyKey: input.idempotencyKey }));
      if (existing) {
        return {
          created: false,
          record: toPublicRecord<WeChatDispatchRecord>(existing),
        };
      }
    }
    throw error;
  }
}

export async function getWeChatDispatchByIdempotencyKey(
  idempotencyKey: string,
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<WeChatDispatchRecord | null> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const dispatches = await deps.getCollection(DISPATCH_COLLECTION);
  const row = await dispatches.findOne({ idempotencyKey: String(idempotencyKey || "").trim() });
  return row ? toPublicRecord<WeChatDispatchRecord>(row) : null;
}

export async function getWeChatDispatchById(
  dispatchId: string,
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<WeChatDispatchRecord | null> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const dispatches = await deps.getCollection(DISPATCH_COLLECTION);
  const row = await dispatches.findOne({ dispatchId: String(dispatchId || "").trim() });
  return row ? toPublicRecord<WeChatDispatchRecord>(row) : null;
}

export async function appendWeChatDispatchStatusEvent(
  input: {
    dispatchId: string;
    eventType: WeChatDispatchStatusEventType;
    providerStatus: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
    providerRequestId?: string | null;
    providerErrorCode?: string | null;
    metadata?: Record<string, unknown>;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{ created: boolean; record: WeChatDispatchStatusEventRecord }> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const statusEvents = await deps.getCollection(DISPATCH_STATUS_COLLECTION);

  const dispatchId = String(input.dispatchId || "").trim();
  if (!dispatchId) throw new Error("dispatchId required");

  const eventType = input.eventType;
  const providerStatus = input.providerStatus;
  const providerRequestId = String(input.providerRequestId || "").trim() || null;
  const providerErrorCode = String(input.providerErrorCode || "").trim() || null;

  const statusEventId = buildDispatchStatusEventId({
    dispatchId,
    eventType,
    providerStatus,
    providerRequestId,
    providerErrorCode,
    metadata: input.metadata,
  });

  const record: WeChatDispatchStatusEventRecord = {
    statusEventId,
    dispatchId,
    eventType,
    providerStatus,
    providerRequestId,
    providerErrorCode,
    metadata: input.metadata,
    createdAt: deps.now().toISOString(),
  };

  try {
    const inserted = await statusEvents.insertOne(record as any);
    return {
      created: true,
      record: {
        ...record,
        _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
      },
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await statusEvents.findOne({ statusEventId });
      if (existing) {
        return {
          created: false,
          record: toPublicRecord<WeChatDispatchStatusEventRecord>(existing),
        };
      }
    }
    throw error;
  }
}

export async function listWeChatDispatchStatusEvents(
  dispatchId: string,
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<WeChatDispatchStatusEventRecord[]> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const statusEvents = await deps.getCollection(DISPATCH_STATUS_COLLECTION);
  const rows = await statusEvents
    .find({ dispatchId: String(dispatchId || "").trim() })
    .sort({ createdAt: 1, statusEventId: 1 })
    .toArray();

  return rows.map((row) => toPublicRecord<WeChatDispatchStatusEventRecord>(row));
}

export async function listWeChatDispatches(
  params: {
    eventCode?: string;
    providerStatus?: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
    recipientBindingId?: string;
    orderId?: string;
    complianceCaseId?: string;
    shipmentId?: string;
    paymentId?: string;
    page?: number;
    limit?: number;
  } = {},
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{
  items: Array<WeChatDispatchRecord & { latestProviderStatus: WeChatDispatchStatusEventRecord | null }>;
  total: number;
  page: number;
  limit: number;
}> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const dispatches = await deps.getCollection(DISPATCH_COLLECTION);

  const query: Record<string, unknown> = {};
  if (params.eventCode) query.eventCode = String(params.eventCode).trim();
  if (params.recipientBindingId) query.recipientBindingId = String(params.recipientBindingId).trim();
  if (params.orderId) query["correlation.orderId"] = String(params.orderId).trim();
  if (params.complianceCaseId) query["correlation.complianceCaseId"] = String(params.complianceCaseId).trim();
  if (params.shipmentId) query["correlation.shipmentId"] = String(params.shipmentId).trim();
  if (params.paymentId) query["correlation.paymentId"] = String(params.paymentId).trim();

  const limit = Math.min(Math.max(Number(params.limit || 50), 1), 200);
  const page = Math.max(Number(params.page || 1), 1);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    dispatches.find(query).sort({ createdAt: -1, dispatchId: 1 }).skip(skip).limit(limit).toArray(),
    dispatches.countDocuments(query),
  ]);

  const items = rows.map((row) => toPublicRecord<WeChatDispatchRecord>(row));
  const withStatuses = await Promise.all(
    items.map(async (item) => {
      const statusEvents = await listWeChatDispatchStatusEvents(item.dispatchId, dependencyOverrides);
      const latestProviderStatus = statusEvents.length > 0 ? statusEvents[statusEvents.length - 1] : null;
      return {
        ...item,
        latestProviderStatus,
      };
    })
  );

  const filtered = params.providerStatus
    ? withStatuses.filter((item) => (item.latestProviderStatus?.providerStatus || item.provider.providerStatus) === params.providerStatus)
    : withStatuses;

  return {
    items: filtered,
    total: params.providerStatus ? filtered.length : total,
    page,
    limit,
  };
}

export async function listWeChatDispatchSliceForRegulator(
  params: {
    bindingId?: string;
    limit?: number;
    page?: number;
  } = {},
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{
  items: Array<{
    dispatchIdMasked: string;
    bindingIdMasked: string;
    bodyHash: string;
    bodyLength: number;
    status: WeChatDispatchRecord["provider"]["providerStatus"];
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const dispatches = await deps.getCollection(DISPATCH_COLLECTION);

  const query: Record<string, unknown> = {};
  if (params.bindingId) query.recipientBindingId = String(params.bindingId || "").trim();

  const limit = Math.min(Math.max(Number(params.limit || 50), 1), 200);
  const page = Math.max(Number(params.page || 1), 1);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    dispatches.find(query).sort({ createdAt: -1, dispatchId: 1 }).skip(skip).limit(limit).toArray(),
    dispatches.countDocuments(query),
  ]);

  return {
    items: rows.map((row) => {
      const publicRow = toPublicRecord<WeChatDispatchRecord>(row);
      const renderedBody = String(publicRow.render?.renderedPayload || "");
      const bodyHash = sha256Hex(renderedBody);
      const bodyLength = Buffer.byteLength(renderedBody, "utf8");
      return {
        dispatchIdMasked: maskId(publicRow.dispatchId),
        bindingIdMasked: maskId(publicRow.recipientBindingId),
        bodyHash,
        bodyLength,
        status: publicRow.provider.providerStatus,
        createdAt: publicRow.createdAt,
      };
    }),
    total,
    page,
    limit,
  };
}

export async function listWeChatInboundMessageRecords(
  params: {
    recipientBindingId?: string;
    processed?: boolean;
    unreadOnly?: boolean;
    limit?: number;
    page?: number;
  } = {},
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{ items: WeChatInboundMessageRecord[]; total: number; page: number; limit: number }> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const inbound = await deps.getCollection(INBOUND_COLLECTION);

  const query: Record<string, unknown> = {};
  if (params.recipientBindingId) {
    query.recipientBindingId = String(params.recipientBindingId || "").trim();
  }
  if (params.unreadOnly) {
    query.$or = [{ processed: false }, { unread: true }, { "metadata.unread": true }];
  } else if (typeof params.processed === "boolean") {
    query.processed = params.processed;
  }

  const limit = Math.min(Math.max(Number(params.limit || 50), 1), 200);
  const page = Math.max(Number(params.page || 1), 1);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    inbound.find(query).sort({ receivedAt: -1, inboundId: 1 }).skip(skip).limit(limit).toArray(),
    inbound.countDocuments(query),
  ]);

  return {
    items: rows.map((row) => toPublicRecord<WeChatInboundMessageRecord>(row)),
    total,
    page,
    limit,
  };
}

export async function listWeChatInboundSliceForRegulator(
  params: {
    bindingId?: string;
    limit?: number;
    page?: number;
  } = {},
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{
  items: Array<{
    inboundIdMasked: string;
    bindingIdMasked: string;
    bodyHash: string;
    bodyLength: number;
    receivedAt: string;
    processed: boolean;
  }>;
  total: number;
  page: number;
  limit: number;
}> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const inbound = await deps.getCollection(INBOUND_COLLECTION);

  const query: Record<string, unknown> = {};
  if (params.bindingId) query.recipientBindingId = String(params.bindingId || "").trim();

  const limit = Math.min(Math.max(Number(params.limit || 50), 1), 200);
  const page = Math.max(Number(params.page || 1), 1);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    inbound.find(query).sort({ receivedAt: -1, inboundId: 1 }).skip(skip).limit(limit).toArray(),
    inbound.countDocuments(query),
  ]);

  return {
    items: rows.map((row) => {
      const publicRow = toPublicRecord<WeChatInboundMessageRecord>(row);
      const payloadCanonical = stableStringify(publicRow.inboundPayload || {});
      const bodyHash = sha256Hex(payloadCanonical);
      const bodyLength = Buffer.byteLength(payloadCanonical, "utf8");
      return {
        inboundIdMasked: maskId(publicRow.inboundId),
        bindingIdMasked: maskId(publicRow.recipientBindingId || ""),
        bodyHash,
        bodyLength,
        receivedAt: publicRow.receivedAt,
        processed: Boolean(publicRow.processed),
      };
    }),
    total,
    page,
    limit,
  };
}

export async function getWeChatInboundBindingSummary(
  params: { recipientBindingId: string },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{ unreadCount: number; lastInboundAt: string | null }> {
  const recipientBindingId = String(params.recipientBindingId || "").trim();
  if (!recipientBindingId) return { unreadCount: 0, lastInboundAt: null };

  const [unread, latest] = await Promise.all([
    listWeChatInboundMessageRecords(
      {
        recipientBindingId,
        unreadOnly: true,
        limit: 1,
        page: 1,
      },
      dependencyOverrides
    ),
    listWeChatInboundMessageRecords(
      {
        recipientBindingId,
        limit: 1,
        page: 1,
      },
      dependencyOverrides
    ),
  ]);

  return {
    unreadCount: unread.total,
    lastInboundAt: latest.items[0]?.receivedAt || null,
  };
}

export async function appendWeChatInboundMessageRecord(
  input: {
    recipientBindingId?: string | null;
    eventContextHint?: { dispatchId?: string | null; eventCode?: string | null };
    inboundPayload: Record<string, unknown>;
    receivedAt?: string;
    processed: boolean;
    processingResult: WeChatInboundMessageRecord["processingResult"];
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{ created: boolean; record: WeChatInboundMessageRecord }> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const inbound = await deps.getCollection(INBOUND_COLLECTION);

  const receivedAt = String(input.receivedAt || deps.now().toISOString()).trim() || deps.now().toISOString();
  const inboundPayloadHashSha256 = sha256Hex(stableStringify(input.inboundPayload || {}));
  const inboundId = buildInboundId({
    recipientBindingId: input.recipientBindingId || null,
    inboundPayloadHashSha256,
    receivedAt,
  });

  const record: WeChatInboundMessageRecord = {
    inboundId,
    recipientBindingId: String(input.recipientBindingId || "").trim() || null,
    eventContextHint: input.eventContextHint
      ? {
          dispatchId: String(input.eventContextHint.dispatchId || "").trim() || null,
          eventCode: String(input.eventContextHint.eventCode || "").trim() || null,
        }
      : undefined,
    inboundPayload: input.inboundPayload,
    inboundPayloadHashSha256,
    receivedAt,
    processed: input.processed,
    processingResult: input.processingResult,
    createdAt: deps.now().toISOString(),
  };

  try {
    const inserted = await inbound.insertOne(record as any);
    return {
      created: true,
      record: {
        ...record,
        _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
      },
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await inbound.findOne({ inboundId });
      if (existing) {
        return {
          created: false,
          record: toPublicRecord<WeChatInboundMessageRecord>(existing),
        };
      }
    }
    throw error;
  }
}

export async function appendWeChatAuditAttestation(
  input: {
    runId: string;
    scorecardJson: Record<string, unknown>;
    signedPdfPath: string;
    summaryPdfPath: string;
    hashManifestPath: string;
  },
  dependencyOverrides: Partial<WeChatStoreDependencies> = {}
): Promise<{ created: boolean; record: WeChatAuditAttestationRecord }> {
  await ensureWeChatIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const attestations = await deps.getCollection(ATTESTATION_COLLECTION);

  const record: WeChatAuditAttestationRecord = {
    runId: String(input.runId || "").trim(),
    scorecardJson: input.scorecardJson,
    signedPdfPath: String(input.signedPdfPath || "").trim(),
    summaryPdfPath: String(input.summaryPdfPath || "").trim(),
    hashManifestPath: String(input.hashManifestPath || "").trim(),
    createdAt: deps.now().toISOString(),
  };

  try {
    const inserted = await attestations.insertOne(record as any);
    return {
      created: true,
      record: {
        ...record,
        _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
      },
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await attestations.findOne({ runId: record.runId });
      if (existing) {
        return {
          created: false,
          record: toPublicRecord<WeChatAuditAttestationRecord>(existing),
        };
      }
    }
    throw error;
  }
}

export function buildWeChatDispatchRecord(input: {
  tenantId?: string | null;
  eventCode: string;
  correlationKey: string;
  recipientBindingId: string;
  idempotencyKey: string;
  payloadHashSha256: string;
}) {
  const payloadHash = canonicalPayloadHash({
    eventCode: input.eventCode,
    correlationKey: input.correlationKey,
    recipientBindingId: input.recipientBindingId,
    idempotencyKey: input.idempotencyKey,
    payloadHashSha256: input.payloadHashSha256,
  });

  const dispatchId = buildDeterministicId({
    artifactClass: "wechat_dispatch",
    tenantId: input.tenantId || null,
    primaryKeyFields: [input.eventCode, input.recipientBindingId, input.correlationKey, input.idempotencyKey],
    canonicalPayloadHash: payloadHash,
  });

  return dispatchId;
}
