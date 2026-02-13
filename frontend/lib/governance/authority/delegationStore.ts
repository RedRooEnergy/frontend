import { getDb } from "../../db/mongo";
import {
  buildDeterministicArtifactId,
  buildDeterministicIdempotencyKey,
  canonicalPayloadHash,
} from "./hash";
import type {
  AuthorityActorRole,
  AuthorityDelegationEventRecord,
  AuthorityDelegationEventType,
} from "./types";

const COLLECTION = "governance_authority_delegation_events";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type FindCursor = {
  sort: (spec: Record<string, 1 | -1>) => {
    limit: (value: number) => {
      toArray: () => Promise<any[]>;
    };
  };
};

type DelegationCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  find: (query: Record<string, unknown>) => FindCursor;
};

export type AuthorityDelegationStoreDependencies = {
  getCollection: () => Promise<DelegationCollection>;
  now: () => Date;
};

const defaultDependencies: AuthorityDelegationStoreDependencies = {
  getCollection: async () => {
    const db = await getDb();
    return db.collection(COLLECTION) as unknown as DelegationCollection;
  },
  now: () => new Date(),
};

let indexesReady: Promise<void> | null = null;

function resolveDependencies(
  overrides: Partial<AuthorityDelegationStoreDependencies> = {}
): AuthorityDelegationStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicRecord(raw: any): AuthorityDelegationEventRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as AuthorityDelegationEventRecord;
}

export async function ensureAuthorityDelegationIndexes(
  dependencyOverrides: Partial<AuthorityDelegationStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection();
      await collection.createIndex({ eventId: 1 }, { unique: true, name: "gov_authority_delegation_event_id_unique" });
      await collection.createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "gov_authority_delegation_idempotency_unique" }
      );
      await collection.createIndex({ delegationId: 1, eventAtUtc: 1 }, { name: "gov_authority_delegation_eventAt" });
      await collection.createIndex(
        { tenantId: 1, granteeActorId: 1, eventAtUtc: -1 },
        { name: "gov_authority_delegation_tenant_grantee_eventAt" }
      );
      await collection.createIndex(
        { tenantId: 1, resource: 1, action: 1, eventAtUtc: -1 },
        { name: "gov_authority_delegation_tenant_resource_action_eventAt" }
      );
    })();
  }

  await indexesReady;
}

export type AppendAuthorityDelegationEventInput = {
  eventType: AuthorityDelegationEventType;
  tenantId?: string | null;
  grantorActorId: string;
  grantorActorRole?: AuthorityActorRole | null;
  granteeActorId: string;
  granteeActorRole?: AuthorityActorRole | null;
  resource: string;
  action: string;
  constraints?: Record<string, unknown>;
  validFromUtc?: string | null;
  validToUtc?: string | null;
  approvalId?: string | null;
  eventAtUtc?: string;
  actorRole: AuthorityActorRole;
  actorId: string;
  metadata?: Record<string, unknown>;
};

export function buildAuthorityDelegationScopeHash(input: {
  tenantId?: string | null;
  grantorActorId: string;
  granteeActorId: string;
  resource: string;
  action: string;
  constraints?: Record<string, unknown>;
  validFromUtc?: string | null;
  validToUtc?: string | null;
}) {
  return canonicalPayloadHash({
    tenantId: String(input.tenantId || "").trim() || null,
    grantorActorId: String(input.grantorActorId || "").trim(),
    granteeActorId: String(input.granteeActorId || "").trim(),
    resource: String(input.resource || "").trim(),
    action: String(input.action || "").trim(),
    constraints: input.constraints || {},
    validFromUtc: input.validFromUtc || null,
    validToUtc: input.validToUtc || null,
  });
}

export function buildAuthorityDelegationId(input: {
  tenantId?: string | null;
  grantorActorId: string;
  granteeActorId: string;
  resource: string;
  action: string;
  validFromUtc?: string | null;
  validToUtc?: string | null;
  scopeHashSha256: string;
}) {
  return buildDeterministicArtifactId({
    artifactClass: "authority_delegation",
    tenantId: input.tenantId || "",
    primaryKeyFields: [
      input.grantorActorId,
      input.granteeActorId,
      input.resource,
      input.action,
      input.validFromUtc || "",
      input.validToUtc || "",
    ],
    canonicalPayloadHash: input.scopeHashSha256,
  });
}

export async function appendAuthorityDelegationEvent(
  input: AppendAuthorityDelegationEventInput,
  dependencyOverrides: Partial<AuthorityDelegationStoreDependencies> = {}
): Promise<{ created: boolean; record: AuthorityDelegationEventRecord }> {
  await ensureAuthorityDelegationIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const tenantId = String(input.tenantId || "").trim() || null;
  const grantorActorId = String(input.grantorActorId || "").trim();
  const granteeActorId = String(input.granteeActorId || "").trim();
  const resource = String(input.resource || "").trim();
  const action = String(input.action || "").trim();
  const actorId = String(input.actorId || "").trim();

  if (!grantorActorId) throw new Error("grantorActorId required");
  if (!granteeActorId) throw new Error("granteeActorId required");
  if (!resource) throw new Error("resource required");
  if (!action) throw new Error("action required");
  if (!actorId) throw new Error("actorId required");

  if (
    (input.eventType === "DELEGATION_GRANTED" || input.eventType === "DELEGATION_REVOKED") &&
    !String(input.approvalId || "").trim()
  ) {
    throw new Error("approvalId required");
  }

  const eventAtUtc = String(input.eventAtUtc || deps.now().toISOString());
  const scopeHashSha256 = buildAuthorityDelegationScopeHash({
    tenantId,
    grantorActorId,
    granteeActorId,
    resource,
    action,
    constraints: input.constraints,
    validFromUtc: input.validFromUtc || null,
    validToUtc: input.validToUtc || null,
  });

  const delegationId = buildAuthorityDelegationId({
    tenantId,
    grantorActorId,
    granteeActorId,
    resource,
    action,
    validFromUtc: input.validFromUtc || null,
    validToUtc: input.validToUtc || null,
    scopeHashSha256,
  });

  const canonicalPayload = {
    delegationId,
    eventType: input.eventType,
    tenantId,
    grantorActorId,
    grantorActorRole: input.grantorActorRole || null,
    granteeActorId,
    granteeActorRole: input.granteeActorRole || null,
    resource,
    action,
    constraints: input.constraints || {},
    scopeHashSha256,
    validFromUtc: input.validFromUtc || null,
    validToUtc: input.validToUtc || null,
    approvalId: input.approvalId || null,
    eventAtUtc,
    actorRole: input.actorRole,
    actorId,
    metadata: input.metadata || null,
  };

  const eventHashSha256 = canonicalPayloadHash(canonicalPayload);
  const eventId = buildDeterministicArtifactId({
    artifactClass: "authority_delegation_event",
    tenantId,
    primaryKeyFields: [delegationId, input.eventType, eventAtUtc],
    canonicalPayloadHash: eventHashSha256,
  });
  const idempotencyKey = buildDeterministicIdempotencyKey({
    artifactClass: "authority_delegation_event",
    tenantId,
    primaryKeyFields: [delegationId, input.eventType, eventAtUtc],
    canonicalPayloadHash: eventHashSha256,
  });

  const record: AuthorityDelegationEventRecord = {
    eventId,
    delegationId,
    eventType: input.eventType,
    tenantId,
    grantorActorId,
    grantorActorRole: input.grantorActorRole || null,
    granteeActorId,
    granteeActorRole: input.granteeActorRole || null,
    resource,
    action,
    constraints: input.constraints || {},
    scopeHashSha256,
    validFromUtc: input.validFromUtc || null,
    validToUtc: input.validToUtc || null,
    approvalId: input.approvalId || null,
    eventAtUtc,
    actorRole: input.actorRole,
    actorId,
    eventHashSha256,
    idempotencyKey,
    metadata: input.metadata,
    createdAtUtc: deps.now().toISOString(),
  };

  try {
    const inserted = await collection.insertOne(record as any);
    return {
      created: true,
      record: {
        ...record,
        _id: typeof inserted.insertedId === "string" ? inserted.insertedId : inserted.insertedId.toString(),
      },
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = (await collection.findOne({ eventId })) || (await collection.findOne({ idempotencyKey }));
      if (existing) {
        return { created: false, record: toPublicRecord(existing) };
      }
    }
    throw error;
  }
}

export async function listAuthorityDelegationEventsByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    tenantId?: string;
    grantorActorId?: string;
    granteeActorId?: string;
    resource?: string;
    action?: string;
  },
  dependencyOverrides: Partial<AuthorityDelegationStoreDependencies> = {}
): Promise<AuthorityDelegationEventRecord[]> {
  await ensureAuthorityDelegationIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const query: Record<string, unknown> = {};
  if (params.tenantId) query.tenantId = String(params.tenantId).trim();
  if (params.grantorActorId) query.grantorActorId = String(params.grantorActorId).trim();
  if (params.granteeActorId) query.granteeActorId = String(params.granteeActorId).trim();
  if (params.resource) query.resource = String(params.resource).trim();
  if (params.action) query.action = String(params.action).trim();

  const range: Record<string, string> = {};
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  if (fromUtc) range.$gte = fromUtc;
  if (toUtc) range.$lte = toUtc;
  if (Object.keys(range).length > 0) query.eventAtUtc = range;

  const limit = Math.min(Math.max(Number(params.limit || 500), 1), 5000);
  const docs = await collection.find(query).sort({ eventAtUtc: -1, eventId: 1 }).limit(limit).toArray();
  return docs.map(toPublicRecord);
}
