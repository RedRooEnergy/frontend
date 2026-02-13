import { getDb } from "../../db/mongo";
import {
  assertHexSha256,
  buildDeterministicArtifactId,
  buildDeterministicIdempotencyKey,
  canonicalJson,
  canonicalPayloadHash,
} from "./hash";
import type { AuthorityShadowDecisionRecord, AuthorityShadowEvaluationInput, AuthorityShadowEvaluationResult } from "./shadowTypes";

const COLLECTION = "governance_authority_shadow_decisions";

type IndexSpec = Record<string, 1 | -1>;
type IndexOptions = Record<string, unknown>;

type FindCursor = {
  sort: (spec: Record<string, 1 | -1>) => {
    limit: (value: number) => {
      toArray: () => Promise<any[]>;
    };
  };
};

type ShadowDecisionCollection = {
  createIndex: (spec: IndexSpec, options?: IndexOptions) => Promise<unknown>;
  insertOne: (doc: any) => Promise<{ insertedId: { toString: () => string } | string }>;
  findOne: (query: Record<string, unknown>) => Promise<any | null>;
  find: (query: Record<string, unknown>) => FindCursor;
};

export type AuthorityShadowStoreDependencies = {
  getCollection: () => Promise<ShadowDecisionCollection>;
  now: () => Date;
};

const defaultDependencies: AuthorityShadowStoreDependencies = {
  getCollection: async () => {
    const db = await getDb();
    return db.collection(COLLECTION) as unknown as ShadowDecisionCollection;
  },
  now: () => new Date(),
};

let indexesReady: Promise<void> | null = null;

function resolveDependencies(overrides: Partial<AuthorityShadowStoreDependencies> = {}): AuthorityShadowStoreDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function toPublicRecord(raw: any): AuthorityShadowDecisionRecord {
  const { _id, ...rest } = raw || {};
  return { ...rest, _id: _id?.toString() } as AuthorityShadowDecisionRecord;
}

export function computeAuthorityShadowCaseKeyHash(input: {
  tenantId?: string | null;
  subjectActorId: string;
  resource: string;
  action: string;
  policyVersionHash?: string | null;
}) {
  const payload = {
    tenantId: String(input.tenantId || "").trim() || null,
    subjectActorId: String(input.subjectActorId || "").trim(),
    resource: String(input.resource || "").trim(),
    action: String(input.action || "").trim(),
    policyVersionHash: String(input.policyVersionHash || "").trim().toLowerCase() || null,
  };
  return canonicalPayloadHash(payload);
}

export async function ensureAuthorityShadowDecisionIndexes(
  dependencyOverrides: Partial<AuthorityShadowStoreDependencies> = {}
): Promise<void> {
  const deps = resolveDependencies(dependencyOverrides);
  if (!indexesReady) {
    indexesReady = (async () => {
      const collection = await deps.getCollection();
      await collection.createIndex({ decisionId: 1 }, { unique: true, name: "gov_authority_shadow_decision_id_unique" });
      await collection.createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "gov_authority_shadow_decision_idempotency_unique" }
      );
      await collection.createIndex(
        { tenantId: 1, resource: 1, action: 1, decidedAtUtc: -1 },
        { name: "gov_authority_shadow_decision_tenant_resource_action_decidedAt" }
      );
      await collection.createIndex(
        { wouldBlock: 1, decidedAtUtc: -1 },
        { name: "gov_authority_shadow_decision_wouldBlock_decidedAt" }
      );
      await collection.createIndex(
        { policyConflictCode: 1, decidedAtUtc: -1 },
        { name: "gov_authority_shadow_decision_conflict_decidedAt" }
      );
      await collection.createIndex(
        { caseKeyHashSha256: 1, decidedAtUtc: -1 },
        { name: "gov_authority_shadow_decision_caseKey_decidedAt" }
      );
      await collection.createIndex(
        { policyId: 1, policyVersionHash: 1, decidedAtUtc: -1 },
        { name: "gov_authority_shadow_decision_policy_decidedAt" }
      );
    })();
  }

  await indexesReady;
}

export type AppendAuthorityShadowDecisionInput = {
  evaluationInput: AuthorityShadowEvaluationInput;
  evaluationResult: AuthorityShadowEvaluationResult;
};

export async function appendAuthorityShadowDecision(
  input: AppendAuthorityShadowDecisionInput,
  dependencyOverrides: Partial<AuthorityShadowStoreDependencies> = {}
): Promise<{ created: boolean; record: AuthorityShadowDecisionRecord }> {
  await ensureAuthorityShadowDecisionIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const evaluationInput = input.evaluationInput;
  const evaluation = input.evaluationResult;

  const tenantId = String(evaluationInput.tenantId || "").trim() || null;
  const policyId = String(evaluationInput.policyId || "").trim();
  const policyVersionHash = String(evaluation.policyVersionHash || "").trim().toLowerCase() || null;
  const subjectActorId = String(evaluationInput.subjectActorId || "").trim();
  const requestActorId = String(evaluationInput.requestActorId || "").trim();
  const resource = String(evaluationInput.resource || "").trim();
  const action = String(evaluationInput.action || "").trim();
  const decidedAtUtc = String(evaluationInput.decidedAtUtc || deps.now().toISOString());

  if (!policyId) throw new Error("policyId required");
  if (!subjectActorId) throw new Error("subjectActorId required");
  if (!requestActorId) throw new Error("requestActorId required");
  if (!resource) throw new Error("resource required");
  if (!action) throw new Error("action required");
  if (policyVersionHash) assertHexSha256(policyVersionHash, "policyVersionHash");

  const caseKeyHashSha256 = computeAuthorityShadowCaseKeyHash({
    tenantId,
    subjectActorId,
    resource,
    action,
    policyVersionHash,
  });

  const canonicalDecisionPayload = {
    tenantId,
    policyId,
    policyVersionHash,
    policyLifecycleState: evaluation.policyLifecycleState,
    subjectActorId,
    requestActorId,
    requestActorRole: evaluationInput.requestActorRole,
    approverActorId: String(evaluationInput.approverActorId || "").trim() || null,
    approverActorRole: evaluationInput.approverActorRole || null,
    delegationId: String(evaluationInput.delegationId || "").trim() || null,
    resource,
    action,
    wouldDecision: evaluation.wouldDecision,
    wouldBlock: evaluation.wouldBlock,
    reasonCodes: evaluation.reasonCodes,
    policyConflictCode: evaluation.policyConflictCode,
    delegationEvaluationResult: evaluation.delegationEvaluationResult,
    approvalRequirementEvaluation: evaluation.approvalRequirementEvaluation,
    shadowEvaluatorVersion: evaluation.shadowEvaluatorVersion,
    decidedAtUtc,
    metadata: evaluationInput.metadata || null,
  };

  const canonicalDecisionJson = canonicalJson(canonicalDecisionPayload);
  const decisionHashSha256 = canonicalPayloadHash(canonicalDecisionPayload);
  const decisionId = buildDeterministicArtifactId({
    artifactClass: "authority_shadow_decision",
    tenantId,
    primaryKeyFields: [policyId, policyVersionHash || "", subjectActorId, requestActorId, resource, action, evaluation.wouldDecision, decidedAtUtc],
    canonicalPayloadHash: decisionHashSha256,
  });
  const idempotencyKey = buildDeterministicIdempotencyKey({
    artifactClass: "authority_shadow_decision",
    tenantId,
    primaryKeyFields: [policyId, policyVersionHash || "", subjectActorId, requestActorId, resource, action, evaluation.wouldDecision, decidedAtUtc],
    canonicalPayloadHash: decisionHashSha256,
  });

  const record: AuthorityShadowDecisionRecord = {
    decisionId,
    caseKeyHashSha256,
    idempotencyKey,
    tenantId,
    policyId,
    policyVersionHash,
    policyLifecycleState: evaluation.policyLifecycleState,
    subjectActorId,
    requestActorId,
    requestActorRole: evaluationInput.requestActorRole,
    approverActorId: String(evaluationInput.approverActorId || "").trim() || null,
    approverActorRole: evaluationInput.approverActorRole || null,
    delegationId: String(evaluationInput.delegationId || "").trim() || null,
    resource,
    action,
    wouldDecision: evaluation.wouldDecision,
    wouldBlock: evaluation.wouldBlock,
    reasonCodes: evaluation.reasonCodes,
    policyConflictCode: evaluation.policyConflictCode,
    delegationEvaluationResult: evaluation.delegationEvaluationResult,
    approvalRequirementEvaluation: evaluation.approvalRequirementEvaluation,
    shadowEvaluatorVersion: evaluation.shadowEvaluatorVersion,
    decisionHashSha256,
    canonicalDecisionJson,
    decidedAtUtc,
    metadata: evaluationInput.metadata,
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

export async function listAuthorityShadowDecisionsByWindow(
  params: {
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    tenantId?: string;
    policyId?: string;
    resource?: string;
    action?: string;
  },
  dependencyOverrides: Partial<AuthorityShadowStoreDependencies> = {}
): Promise<AuthorityShadowDecisionRecord[]> {
  await ensureAuthorityShadowDecisionIndexes(dependencyOverrides);
  const deps = resolveDependencies(dependencyOverrides);
  const collection = await deps.getCollection();

  const query: Record<string, unknown> = {};
  if (params.tenantId) query.tenantId = String(params.tenantId).trim();
  if (params.policyId) query.policyId = String(params.policyId).trim();
  if (params.resource) query.resource = String(params.resource).trim();
  if (params.action) query.action = String(params.action).trim();

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
