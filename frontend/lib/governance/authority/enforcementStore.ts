import { getDb } from "../../db/mongo";
import {
  assertHexSha256,
  buildDeterministicArtifactId,
  buildDeterministicIdempotencyKey,
  canonicalJson,
  canonicalPayloadHash,
} from "./hash";
import type { AuthorityShadowDecisionRecord } from "./shadowTypes";
import { getAuthorityShadowDecisionById, type AuthorityShadowStoreDependencies } from "./shadowStore";
import {
  AUTHORITY_ENFORCEMENT_VERSION,
  type AuthorityEnforcementDecisionRecord,
  type AuthorityEnforcementResult,
} from "./enforcementTypes";
import type { AuthorityActorRole } from "./types";

const COLLECTION = "governance_authority_enforcement_decisions";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type FindCursor = {
  sort: (spec: Record<string, 1 | -1>) => {
    limit: (value: number) => {
      toArray: () => Promise<any[]>;
    };
  };
};

type EnforcementCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  find: (query: Record<string, unknown>) => FindCursor;
};

export type AuthorityEnforcementStoreDependencies = {
  getCollection: () => Promise<EnforcementCollection>;
  getShadowDecisionById: (
    decisionId: string,
    dependencyOverrides?: Partial<AuthorityShadowStoreDependencies>
  ) => Promise<AuthorityShadowDecisionRecord | null>;
  now: () => Date;
};

const defaultDependencies: AuthorityEnforcementStoreDependencies = {
  getCollection: async () => {
    const db = await getDb();
    return db.collection(COLLECTION) as unknown as EnforcementCollection;
  },
  getShadowDecisionById: (decisionId, deps) => getAuthorityShadowDecisionById(decisionId, deps),
  now: () => new Date(),
};

let indexesReady: Promise<void> | null = null;

function resolveDependencies(
  overrides: Partial<AuthorityEnforcementStoreDependencies> = {}
): AuthorityEnforcementStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicRecord(raw: any): AuthorityEnforcementDecisionRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as AuthorityEnforcementDecisionRecord;
}

export async function ensureAuthorityEnforcementDecisionIndexes(
  dependencyOverrides: Partial<AuthorityEnforcementStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection();
      await collection.createIndex(
        { enforcementDecisionId: 1 },
        { unique: true, name: "gov_authority_enforcement_decision_id_unique" }
      );
      await collection.createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "gov_authority_enforcement_decision_idempotency_unique" }
      );
      await collection.createIndex(
        { shadowDecisionId: 1 },
        { name: "gov_authority_enforcement_shadow_decision" }
      );
      await collection.createIndex(
        { tenantId: 1, resource: 1, action: 1, decidedAtUtc: -1 },
        { name: "gov_authority_enforcement_tenant_resource_action_decidedAt" }
      );
      await collection.createIndex(
        { enforcementResult: 1, decidedAtUtc: -1 },
        { name: "gov_authority_enforcement_result_decidedAt" }
      );
      await collection.createIndex(
        { policyId: 1, policyVersionHash: 1, decidedAtUtc: -1 },
        { name: "gov_authority_enforcement_policy_decidedAt" }
      );
    })();
  }

  await indexesReady;
}

function buildCanonicalEnforcementPayload(input: {
  tenantId?: string | null;
  policyId: string;
  policyVersionHash?: string | null;
  subjectActorId: string;
  requestActorId: string;
  requestActorRole: AuthorityActorRole;
  approverActorId?: string | null;
  approverActorRole?: AuthorityActorRole | null;
  delegationId?: string | null;
  resource: string;
  action: string;
  shadowDecisionId: string;
  shadowDecisionHashSha256: string;
  decisionHashSha256: string;
  enforcementResult: AuthorityEnforcementResult;
  responseMutationCode?: string | null;
  decidedAtUtc: string;
  metadata?: Record<string, unknown>;
}) {
  return {
    tenantId: String(input.tenantId || "").trim() || null,
    policyId: String(input.policyId || "").trim(),
    policyVersionHash: String(input.policyVersionHash || "").trim().toLowerCase() || null,
    subjectActorId: String(input.subjectActorId || "").trim(),
    requestActorId: String(input.requestActorId || "").trim(),
    requestActorRole: input.requestActorRole,
    approverActorId: String(input.approverActorId || "").trim() || null,
    approverActorRole: input.approverActorRole || null,
    delegationId: String(input.delegationId || "").trim() || null,
    resource: String(input.resource || "").trim(),
    action: String(input.action || "").trim(),
    shadowDecisionId: String(input.shadowDecisionId || "").trim(),
    shadowDecisionHashSha256: String(input.shadowDecisionHashSha256 || "").trim().toLowerCase(),
    decisionHashSha256: String(input.decisionHashSha256 || "").trim().toLowerCase(),
    enforcementMode: true,
    enforcementVersion: AUTHORITY_ENFORCEMENT_VERSION,
    enforcementResult: input.enforcementResult,
    responseMutationCode: String(input.responseMutationCode || "").trim() || null,
    decidedAtUtc: String(input.decidedAtUtc || "").trim(),
    metadata: input.metadata || null,
  } as const;
}

export type AppendAuthorityEnforcementDecisionInput = {
  tenantId?: string | null;
  policyId: string;
  policyVersionHash?: string | null;
  subjectActorId: string;
  requestActorId: string;
  requestActorRole: AuthorityActorRole;
  approverActorId?: string | null;
  approverActorRole?: AuthorityActorRole | null;
  delegationId?: string | null;
  resource: string;
  action: string;
  shadowDecisionId: string;
  shadowDecisionHashSha256: string;
  decisionHashSha256: string;
  enforcementResult: AuthorityEnforcementResult;
  responseMutationCode?: string | null;
  decidedAtUtc: string;
  metadata?: Record<string, unknown>;
};

export async function appendAuthorityEnforcementDecision(
  input: AppendAuthorityEnforcementDecisionInput,
  dependencyOverrides: Partial<AuthorityEnforcementStoreDependencies> = {}
): Promise<{ created: boolean; record: AuthorityEnforcementDecisionRecord }> {
  await ensureAuthorityEnforcementDecisionIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const shadowDecisionId = String(input.shadowDecisionId || "").trim();
  if (!shadowDecisionId) throw new Error("shadowDecisionId required");

  const shadow = await deps.getShadowDecisionById(shadowDecisionId);
  if (!shadow) {
    throw new Error("AUTHORITY_ENFORCEMENT_SHADOW_DECISION_NOT_FOUND");
  }

  const shadowDecisionHashSha256 = String(input.shadowDecisionHashSha256 || "").trim().toLowerCase();
  const decisionHashSha256 = String(input.decisionHashSha256 || "").trim().toLowerCase();
  assertHexSha256(shadowDecisionHashSha256, "shadowDecisionHashSha256");
  assertHexSha256(decisionHashSha256, "decisionHashSha256");

  if (shadow.decisionHashSha256 !== shadowDecisionHashSha256 || shadow.decisionHashSha256 !== decisionHashSha256) {
    throw new Error("AUTHORITY_ENFORCEMENT_DECISION_HASH_MISMATCH");
  }

  const canonicalPayload = buildCanonicalEnforcementPayload({
    ...input,
    shadowDecisionId,
    shadowDecisionHashSha256,
    decisionHashSha256,
  });

  const canonicalEnforcementJson = canonicalJson(canonicalPayload);
  const deterministicHashSha256 = canonicalPayloadHash(canonicalPayload);

  const tenantId = canonicalPayload.tenantId;
  const enforcementDecisionId = buildDeterministicArtifactId({
    artifactClass: "authority_enforcement_decision",
    tenantId,
    primaryKeyFields: [
      canonicalPayload.policyId,
      canonicalPayload.policyVersionHash || "",
      canonicalPayload.subjectActorId,
      canonicalPayload.requestActorId,
      canonicalPayload.resource,
      canonicalPayload.action,
      canonicalPayload.enforcementResult,
      canonicalPayload.decidedAtUtc,
    ],
    canonicalPayloadHash: deterministicHashSha256,
  });

  const idempotencyKey = buildDeterministicIdempotencyKey({
    artifactClass: "authority_enforcement_decision",
    tenantId,
    primaryKeyFields: [
      canonicalPayload.policyId,
      canonicalPayload.policyVersionHash || "",
      canonicalPayload.subjectActorId,
      canonicalPayload.requestActorId,
      canonicalPayload.resource,
      canonicalPayload.action,
      canonicalPayload.enforcementResult,
      canonicalPayload.decidedAtUtc,
    ],
    canonicalPayloadHash: deterministicHashSha256,
  });

  const record: AuthorityEnforcementDecisionRecord = {
    enforcementDecisionId,
    idempotencyKey,
    tenantId,
    policyId: canonicalPayload.policyId,
    policyVersionHash: canonicalPayload.policyVersionHash,
    subjectActorId: canonicalPayload.subjectActorId,
    requestActorId: canonicalPayload.requestActorId,
    requestActorRole: canonicalPayload.requestActorRole,
    approverActorId: canonicalPayload.approverActorId,
    approverActorRole: canonicalPayload.approverActorRole,
    delegationId: canonicalPayload.delegationId,
    resource: canonicalPayload.resource,
    action: canonicalPayload.action,
    shadowDecisionId: canonicalPayload.shadowDecisionId,
    shadowDecisionHashSha256: canonicalPayload.shadowDecisionHashSha256,
    decisionHashSha256: canonicalPayload.decisionHashSha256,
    enforcementMode: true,
    enforcementVersion: AUTHORITY_ENFORCEMENT_VERSION,
    enforcementResult: canonicalPayload.enforcementResult,
    responseMutationCode: canonicalPayload.responseMutationCode,
    deterministicHashSha256,
    canonicalEnforcementJson,
    decidedAtUtc: canonicalPayload.decidedAtUtc,
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
      const existing =
        (await collection.findOne({ enforcementDecisionId })) ||
        (await collection.findOne({ idempotencyKey }));
      if (existing) return { created: false, record: toPublicRecord(existing) };
    }
    throw error;
  }
}

export async function listAuthorityEnforcementDecisionsByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    tenantId?: string;
    policyId?: string;
    resource?: string;
    action?: string;
    enforcementResult?: AuthorityEnforcementResult;
  },
  dependencyOverrides: Partial<AuthorityEnforcementStoreDependencies> = {}
): Promise<AuthorityEnforcementDecisionRecord[]> {
  await ensureAuthorityEnforcementDecisionIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const query: Record<string, unknown> = {};
  if (params.tenantId) query.tenantId = String(params.tenantId).trim();
  if (params.policyId) query.policyId = String(params.policyId).trim();
  if (params.resource) query.resource = String(params.resource).trim();
  if (params.action) query.action = String(params.action).trim();
  if (params.enforcementResult) query.enforcementResult = params.enforcementResult;

  const range: Record<string, string> = {};
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  if (fromUtc) range.$gte = fromUtc;
  if (toUtc) range.$lte = toUtc;
  if (Object.keys(range).length > 0) query.decidedAtUtc = range;

  const limit = Math.min(Math.max(Number(params.limit || 500), 1), 5000);
  const docs = await collection.find(query).sort({ decidedAtUtc: -1, enforcementDecisionId: 1 }).limit(limit).toArray();
  return docs.map(toPublicRecord);
}
