import { getDb } from "../../db/mongo";
import {
  assertHexSha256,
  buildDeterministicArtifactId,
  buildDeterministicIdempotencyKey,
  canonicalPayloadHash,
} from "./hash";
import type {
  AuthorityActorChain,
  AuthorityApprovalDecisionRecord,
  AuthorityDecisionType,
} from "./types";

const COLLECTION = "governance_authority_approval_decisions";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type FindCursor = {
  sort: (spec: Record<string, 1 | -1>) => {
    limit: (value: number) => {
      toArray: () => Promise<any[]>;
    };
  };
};

type DecisionCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  find: (query: Record<string, unknown>) => FindCursor;
};

export type AuthorityDecisionStoreDependencies = {
  getCollection: () => Promise<DecisionCollection>;
  now: () => Date;
};

const defaultDependencies: AuthorityDecisionStoreDependencies = {
  getCollection: async () => {
    const db = await getDb();
    return db.collection(COLLECTION) as unknown as DecisionCollection;
  },
  now: () => new Date(),
};

let indexesReady: Promise<void> | null = null;

function resolveDependencies(overrides: Partial<AuthorityDecisionStoreDependencies> = {}): AuthorityDecisionStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicRecord(raw: any): AuthorityApprovalDecisionRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as AuthorityApprovalDecisionRecord;
}

export function normalizeAuthorityActorChain(input: AuthorityActorChain) {
  return {
    requestActorId: String(input.requestActorId || "").trim(),
    requestActorRole: input.requestActorRole,
    approverActorId: String(input.approverActorId || "").trim() || null,
    approverActorRole: input.approverActorRole || null,
    delegationId: String(input.delegationId || "").trim() || null,
    policyVersionHash: String(input.policyVersionHash || "").trim().toLowerCase(),
    sessionId: String(input.sessionId || "").trim() || null,
    elevationHash: String(input.elevationHash || "").trim() || null,
  };
}

export function computeAuthorityActorChainHash(input: AuthorityActorChain) {
  const normalized = normalizeAuthorityActorChain(input);
  assertHexSha256(normalized.policyVersionHash, "actorChain.policyVersionHash");
  if (normalized.elevationHash) {
    assertHexSha256(normalized.elevationHash, "actorChain.elevationHash");
  }
  return canonicalPayloadHash(normalized);
}

export async function ensureAuthorityDecisionIndexes(
  dependencyOverrides: Partial<AuthorityDecisionStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection();
      await collection.createIndex({ decisionId: 1 }, { unique: true, name: "gov_authority_decision_id_unique" });
      await collection.createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "gov_authority_decision_idempotency_unique" }
      );
      await collection.createIndex(
        { tenantId: 1, resource: 1, action: 1, decidedAtUtc: -1 },
        { name: "gov_authority_decision_tenant_resource_action_decidedAt" }
      );
      await collection.createIndex(
        { policyVersionHash: 1, decidedAtUtc: -1 },
        { name: "gov_authority_decision_policyVersion_decidedAt" }
      );
      await collection.createIndex({ decision: 1, decidedAtUtc: -1 }, { name: "gov_authority_decision_type_decidedAt" });
    })();
  }

  await indexesReady;
}

export type AppendAuthorityApprovalDecisionInput = {
  tenantId?: string | null;
  policyId: string;
  policyVersionHash: string;
  subjectActorId: string;
  requestActorId: string;
  requestActorRole: AuthorityActorChain["requestActorRole"];
  approverActorId?: string | null;
  approverActorRole?: AuthorityActorChain["approverActorRole"];
  resource: string;
  action: string;
  decision: AuthorityDecisionType;
  reasonCodes?: string[];
  approvalId?: string | null;
  actorChain: AuthorityActorChain;
  decidedAtUtc?: string;
  metadata?: Record<string, unknown>;
};

export async function appendAuthorityApprovalDecision(
  input: AppendAuthorityApprovalDecisionInput,
  dependencyOverrides: Partial<AuthorityDecisionStoreDependencies> = {}
): Promise<{ created: boolean; record: AuthorityApprovalDecisionRecord }> {
  await ensureAuthorityDecisionIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const tenantId = String(input.tenantId || "").trim() || null;
  const policyId = String(input.policyId || "").trim();
  const policyVersionHash = String(input.policyVersionHash || "").trim().toLowerCase();
  const subjectActorId = String(input.subjectActorId || "").trim();
  const requestActorId = String(input.requestActorId || "").trim();
  const approverActorId = String(input.approverActorId || "").trim() || null;
  const resource = String(input.resource || "").trim();
  const action = String(input.action || "").trim();

  if (!policyId) throw new Error("policyId required");
  if (!policyVersionHash) throw new Error("policyVersionHash required");
  if (!subjectActorId) throw new Error("subjectActorId required");
  if (!requestActorId) throw new Error("requestActorId required");
  if (!resource) throw new Error("resource required");
  if (!action) throw new Error("action required");
  assertHexSha256(policyVersionHash, "policyVersionHash");

  if ((input.decision === "APPROVED" || input.decision === "DENIED") && !String(input.approvalId || "").trim()) {
    throw new Error("approvalId required");
  }

  const actorChainHashSha256 = computeAuthorityActorChainHash({
    ...input.actorChain,
    requestActorId,
    requestActorRole: input.requestActorRole,
    approverActorId,
    approverActorRole: input.approverActorRole || null,
    policyVersionHash,
  });

  const decidedAtUtc = String(input.decidedAtUtc || deps.now().toISOString());
  const reasonCodes = Array.from(new Set((input.reasonCodes || []).map((entry) => String(entry || "").trim()).filter(Boolean))).sort();

  const canonicalDecisionPayload = {
    tenantId,
    policyId,
    policyVersionHash,
    subjectActorId,
    requestActorId,
    approverActorId,
    resource,
    action,
    decision: input.decision,
    reasonCodes,
    approvalId: input.approvalId || null,
    actorChainHashSha256,
    decidedAtUtc,
    metadata: input.metadata || null,
  };

  const decisionHashSha256 = canonicalPayloadHash(canonicalDecisionPayload);
  const decisionId = buildDeterministicArtifactId({
    artifactClass: "authority_approval_decision",
    tenantId,
    primaryKeyFields: [policyId, policyVersionHash, subjectActorId, requestActorId, resource, action, input.decision, decidedAtUtc],
    canonicalPayloadHash: decisionHashSha256,
  });
  const idempotencyKey = buildDeterministicIdempotencyKey({
    artifactClass: "authority_approval_decision",
    tenantId,
    primaryKeyFields: [policyId, policyVersionHash, subjectActorId, requestActorId, resource, action, input.decision, decidedAtUtc],
    canonicalPayloadHash: decisionHashSha256,
  });

  const record: AuthorityApprovalDecisionRecord = {
    decisionId,
    tenantId,
    policyId,
    policyVersionHash,
    subjectActorId,
    requestActorId,
    approverActorId,
    resource,
    action,
    decision: input.decision,
    reasonCodes,
    approvalId: input.approvalId || null,
    actorChainHashSha256,
    decisionHashSha256,
    idempotencyKey,
    decidedAtUtc,
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
      const existing = (await collection.findOne({ decisionId })) || (await collection.findOne({ idempotencyKey }));
      if (existing) return { created: false, record: toPublicRecord(existing) };
    }
    throw error;
  }
}

export async function listAuthorityApprovalDecisionsByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    tenantId?: string;
    policyId?: string;
    decision?: AuthorityDecisionType;
  },
  dependencyOverrides: Partial<AuthorityDecisionStoreDependencies> = {}
): Promise<AuthorityApprovalDecisionRecord[]> {
  await ensureAuthorityDecisionIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const query: Record<string, unknown> = {};
  if (params.tenantId) query.tenantId = String(params.tenantId).trim();
  if (params.policyId) query.policyId = String(params.policyId).trim();
  if (params.decision) query.decision = params.decision;

  const range: Record<string, string> = {};
  const fromUtc = String(params.fromUtc || "").trim();
  const toUtc = String(params.toUtc || "").trim();
  if (fromUtc) range.$gte = fromUtc;
  if (toUtc) range.$lte = toUtc;
  if (Object.keys(range).length > 0) query.decidedAtUtc = range;

  const limit = Math.min(Math.max(Number(params.limit || 500), 1), 5000);
  const docs = await collection.find(query).sort({ decidedAtUtc: -1, decisionId: 1 }).limit(limit).toArray();
  return docs.map(toPublicRecord);
}
