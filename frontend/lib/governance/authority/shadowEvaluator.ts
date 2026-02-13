import { canonicalJson, canonicalPayloadHash } from "./hash";
import {
  listAuthorityDelegationEventsByWindow,
  type AuthorityDelegationStoreDependencies,
} from "./delegationStore";
import {
  listAuthorityPolicyLifecycleEventsByWindow,
  listAuthorityPolicyVersionsByWindow,
  type AuthorityPolicyStoreDependencies,
} from "./policyStore";
import {
  AUTHORITY_SHADOW_EVALUATOR_VERSION,
  type AuthorityShadowConflictCode,
  type AuthorityShadowEvaluationInput,
  type AuthorityShadowEvaluationResult,
} from "./shadowTypes";
import type { AuthorityDelegationEventRecord, AuthorityPolicyLifecycleEventRecord, AuthorityPolicyVersionRecord } from "./types";

export type AuthorityShadowEvaluatorDependencies = {
  listPolicyVersions: (
    params: { policyId: string; limit: number },
    dependencyOverrides?: Partial<AuthorityPolicyStoreDependencies>
  ) => Promise<AuthorityPolicyVersionRecord[]>;
  listPolicyLifecycleEvents: (
    params: { policyId: string; limit: number },
    dependencyOverrides?: Partial<AuthorityPolicyStoreDependencies>
  ) => Promise<AuthorityPolicyLifecycleEventRecord[]>;
  listDelegationEvents: (
    params: {
      tenantId?: string;
      resource: string;
      action: string;
      granteeActorId: string;
      limit: number;
    },
    dependencyOverrides?: Partial<AuthorityDelegationStoreDependencies>
  ) => Promise<AuthorityDelegationEventRecord[]>;
};

const defaultDependencies: AuthorityShadowEvaluatorDependencies = {
  listPolicyVersions: (params, deps) =>
    listAuthorityPolicyVersionsByWindow(
      {
        policyId: params.policyId,
        limit: params.limit,
      },
      deps
    ),
  listPolicyLifecycleEvents: (params, deps) =>
    listAuthorityPolicyLifecycleEventsByWindow(
      {
        policyId: params.policyId,
        limit: params.limit,
      },
      deps
    ),
  listDelegationEvents: (params, deps) =>
    listAuthorityDelegationEventsByWindow(
      {
        tenantId: params.tenantId,
        resource: params.resource,
        action: params.action,
        granteeActorId: params.granteeActorId,
        limit: params.limit,
      },
      deps
    ),
};

function resolveDependencies(
  overrides: Partial<AuthorityShadowEvaluatorDependencies> = {}
): AuthorityShadowEvaluatorDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function normalizeIsoUtc(value: string) {
  const parsed = Date.parse(String(value || "").trim());
  if (!Number.isFinite(parsed)) return new Date().toISOString();
  return new Date(parsed).toISOString();
}

function normalizeConflictCode(
  candidates: Array<AuthorityShadowConflictCode | null>
): AuthorityShadowConflictCode | null {
  const precedence: AuthorityShadowConflictCode[] = [
    "NO_ACTIVE_POLICY",
    "MULTIPLE_ACTIVE_POLICIES",
    "POLICY_VERSION_UNRESOLVED",
    "POLICY_RULE_AMBIGUOUS",
    "DELEGATION_SCOPE_CONFLICT",
    "APPROVAL_SCOPE_CONFLICT",
  ];

  for (const code of precedence) {
    if (candidates.includes(code)) return code;
  }
  return null;
}

function latestLifecycleByVersion(
  lifecycleEvents: AuthorityPolicyLifecycleEventRecord[]
): Map<string, AuthorityPolicyLifecycleEventRecord> {
  const sorted = [...lifecycleEvents].sort((left, right) => {
    if (left.eventAtUtc !== right.eventAtUtc) return right.eventAtUtc.localeCompare(left.eventAtUtc);
    return right.eventId.localeCompare(left.eventId);
  });

  const map = new Map<string, AuthorityPolicyLifecycleEventRecord>();
  for (const event of sorted) {
    if (!map.has(event.policyVersionHash)) {
      map.set(event.policyVersionHash, event);
    }
  }
  return map;
}

function safeParseJson(input: string): unknown | null {
  try {
    return JSON.parse(String(input || ""));
  } catch {
    return null;
  }
}

function getBooleanRule(policy: Record<string, unknown>, key: string) {
  if (typeof policy[key] === "boolean") return Boolean(policy[key]);
  const constraints = policy.constraints;
  if (constraints && typeof constraints === "object" && typeof (constraints as Record<string, unknown>)[key] === "boolean") {
    return Boolean((constraints as Record<string, unknown>)[key]);
  }
  return false;
}

function getStringRule(policy: Record<string, unknown>, key: string): string | null {
  const direct = policy[key];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const constraints = policy.constraints;
  if (constraints && typeof constraints === "object") {
    const nested = (constraints as Record<string, unknown>)[key];
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }
  return null;
}

function getRoleArrayRule(policy: Record<string, unknown>): string[] {
  const direct = policy.allowRoles;
  const constraints = policy.constraints;

  const directArray = Array.isArray(direct) ? direct : [];
  const nestedArray =
    constraints && typeof constraints === "object" && Array.isArray((constraints as Record<string, unknown>).allowRoles)
      ? ((constraints as Record<string, unknown>).allowRoles as unknown[])
      : [];

  return Array.from(
    new Set(
      [...directArray, ...nestedArray]
        .map((entry) => String(entry || "").trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort();
}

function computeDelegationState(input: {
  events: AuthorityDelegationEventRecord[];
  nowIsoUtc: string;
  required: boolean;
}) {
  const latestByDelegationId = new Map<string, AuthorityDelegationEventRecord>();
  const sorted = [...input.events].sort((left, right) => {
    if (left.eventAtUtc !== right.eventAtUtc) return right.eventAtUtc.localeCompare(left.eventAtUtc);
    return right.eventId.localeCompare(left.eventId);
  });

  for (const event of sorted) {
    if (!latestByDelegationId.has(event.delegationId)) {
      latestByDelegationId.set(event.delegationId, event);
    }
  }

  const nowMs = Date.parse(input.nowIsoUtc);
  const active = Array.from(latestByDelegationId.values()).filter((event) => {
    if (event.eventType !== "DELEGATION_GRANTED") return false;

    const validFromMs = event.validFromUtc ? Date.parse(event.validFromUtc) : Number.NEGATIVE_INFINITY;
    const validToMs = event.validToUtc ? Date.parse(event.validToUtc) : Number.POSITIVE_INFINITY;
    return nowMs >= validFromMs && nowMs <= validToMs;
  });

  const scopeHashes = Array.from(new Set(active.map((event) => event.scopeHashSha256)));
  const scopeConflict = active.length > 1 && scopeHashes.length > 1;

  return {
    required: input.required,
    hasValidDelegation: active.length > 0,
    activeDelegationCount: active.length,
    delegationIds: active.map((event) => event.delegationId).sort(),
    scopeConflict,
  };
}

export async function evaluateAuthorityShadowDecision(
  input: AuthorityShadowEvaluationInput,
  dependencyOverrides: Partial<AuthorityShadowEvaluatorDependencies> = {}
): Promise<AuthorityShadowEvaluationResult> {
  const deps = resolveDependencies(dependencyOverrides);
  const decidedAtUtc = normalizeIsoUtc(input.decidedAtUtc);
  const tenantId = String(input.tenantId || "").trim() || null;
  const policyId = String(input.policyId || "").trim();
  const policyVersionHashHint = String(input.policyVersionHash || "").trim().toLowerCase() || null;
  const subjectActorId = String(input.subjectActorId || "").trim();
  const requestActorId = String(input.requestActorId || "").trim();
  const requestActorRole = String(input.requestActorRole || "").trim().toLowerCase();
  const resource = String(input.resource || "").trim();
  const action = String(input.action || "").trim();

  if (!policyId) throw new Error("policyId required");
  if (!subjectActorId) throw new Error("subjectActorId required");
  if (!requestActorId) throw new Error("requestActorId required");
  if (!resource) throw new Error("resource required");
  if (!action) throw new Error("action required");

  const policyVersions = await deps.listPolicyVersions({ policyId, limit: 5000 });
  const policyLifecycleEvents = await deps.listPolicyLifecycleEvents({ policyId, limit: 5000 });
  const lifecycleByVersion = latestLifecycleByVersion(policyLifecycleEvents);

  const activeVersions = policyVersions.filter((version) => {
    const lifecycle = lifecycleByVersion.get(version.policyVersionHash);
    return lifecycle?.lifecycleState === "ACTIVE";
  });

  const conflictCandidates: Array<AuthorityShadowConflictCode | null> = [];
  if (activeVersions.length === 0) conflictCandidates.push("NO_ACTIVE_POLICY");
  if (activeVersions.length > 1) conflictCandidates.push("MULTIPLE_ACTIVE_POLICIES");

  let selectedPolicy: AuthorityPolicyVersionRecord | null = null;
  if (policyVersionHashHint) {
    selectedPolicy = activeVersions.find((version) => version.policyVersionHash === policyVersionHashHint) || null;
    if (!selectedPolicy) {
      conflictCandidates.push("POLICY_VERSION_UNRESOLVED");
    }
  } else if (activeVersions.length === 1) {
    selectedPolicy = activeVersions[0];
  } else if (activeVersions.length > 1) {
    selectedPolicy = [...activeVersions].sort((left, right) => left.policyVersionHash.localeCompare(right.policyVersionHash))[0];
  }

  const selectedLifecycle = selectedPolicy ? lifecycleByVersion.get(selectedPolicy.policyVersionHash) || null : null;

  let parsedPolicy: Record<string, unknown> | null = null;
  if (selectedPolicy) {
    const parsed = safeParseJson(selectedPolicy.canonicalPolicyJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      conflictCandidates.push("POLICY_RULE_AMBIGUOUS");
    } else {
      parsedPolicy = parsed as Record<string, unknown>;
    }
  }

  const requireDelegation = parsedPolicy ? getBooleanRule(parsedPolicy, "requireDelegation") : false;
  const requireApprovalId = parsedPolicy ? getBooleanRule(parsedPolicy, "requireApprovalId") : false;
  const policyResourceRule = parsedPolicy ? getStringRule(parsedPolicy, "resource") : null;
  const policyActionRule = parsedPolicy ? getStringRule(parsedPolicy, "action") : null;
  const allowRoles = parsedPolicy ? getRoleArrayRule(parsedPolicy) : [];

  const delegationEvents = await deps.listDelegationEvents({
    tenantId: tenantId || undefined,
    resource,
    action,
    granteeActorId: requestActorId,
    limit: 5000,
  });

  const delegationEvaluationResult = computeDelegationState({
    events: delegationEvents,
    nowIsoUtc: decidedAtUtc,
    required: requireDelegation,
  });

  if (delegationEvaluationResult.scopeConflict) {
    conflictCandidates.push("DELEGATION_SCOPE_CONFLICT");
  }

  const hasApprover = Boolean(String(input.approverActorId || "").trim());
  const passesSeparationOfDuties = !hasApprover || String(input.approverActorId || "").trim() !== requestActorId;
  const approvalRequirementEvaluation = {
    required: requireApprovalId,
    hasApprover,
    passesSeparationOfDuties,
  };

  if (requireApprovalId && hasApprover && !passesSeparationOfDuties) {
    conflictCandidates.push("APPROVAL_SCOPE_CONFLICT");
  }

  const policyConflictCode = normalizeConflictCode(conflictCandidates);
  const reasonCodes: string[] = [];

  if (policyConflictCode) {
    reasonCodes.push(policyConflictCode);
  }

  if (policyResourceRule && policyResourceRule !== resource) {
    reasonCodes.push("POLICY_RESOURCE_SCOPE_MISMATCH");
  }
  if (policyActionRule && policyActionRule !== action) {
    reasonCodes.push("POLICY_ACTION_SCOPE_MISMATCH");
  }

  if (allowRoles.length > 0 && !allowRoles.includes(requestActorRole)) {
    reasonCodes.push("REQUEST_ROLE_NOT_ALLOWED");
  }

  if (delegationEvaluationResult.required && !delegationEvaluationResult.hasValidDelegation) {
    reasonCodes.push("DELEGATION_REQUIRED_MISSING");
  }

  if (approvalRequirementEvaluation.required && !approvalRequirementEvaluation.hasApprover) {
    reasonCodes.push("APPROVAL_REQUIRED_MISSING");
  }
  if (approvalRequirementEvaluation.required && approvalRequirementEvaluation.hasApprover && !approvalRequirementEvaluation.passesSeparationOfDuties) {
    reasonCodes.push("APPROVER_SEPARATION_OF_DUTIES_FAILED");
  }

  const normalizedReasonCodes = Array.from(new Set(reasonCodes.map((entry) => String(entry || "").trim()).filter(Boolean))).sort();
  const wouldBlock = Boolean(policyConflictCode) || normalizedReasonCodes.length > 0;
  const wouldDecision = wouldBlock ? "WOULD_BLOCK" : "WOULD_ALLOW";

  const evaluationPayload = {
    tenantId,
    policyId,
    policyVersionHash: selectedPolicy?.policyVersionHash || policyVersionHashHint,
    policyLifecycleState: selectedLifecycle?.lifecycleState || null,
    subjectActorId,
    requestActorId,
    requestActorRole,
    approverActorId: String(input.approverActorId || "").trim() || null,
    approverActorRole: input.approverActorRole || null,
    delegationId: String(input.delegationId || "").trim() || null,
    resource,
    action,
    delegationEvaluationResult,
    approvalRequirementEvaluation,
    conflictCode: policyConflictCode,
    reasonCodes: normalizedReasonCodes,
    shadowEvaluatorVersion: AUTHORITY_SHADOW_EVALUATOR_VERSION,
    requestedDecisionHint: input.requestedDecisionHint || null,
    metadata: input.metadata || null,
    decidedAtUtc,
    wouldDecision,
    wouldBlock,
  };

  const canonicalEvaluationJson = canonicalJson(evaluationPayload);
  const evaluationPayloadHashSha256 = canonicalPayloadHash(evaluationPayload);

  return {
    policyId,
    policyVersionHash: selectedPolicy?.policyVersionHash || policyVersionHashHint || null,
    policyLifecycleState: selectedLifecycle?.lifecycleState || null,
    shadowEvaluatorVersion: AUTHORITY_SHADOW_EVALUATOR_VERSION,
    wouldDecision,
    wouldBlock,
    reasonCodes: normalizedReasonCodes,
    policyConflictCode,
    delegationEvaluationResult,
    approvalRequirementEvaluation,
    evaluationPayloadHashSha256,
    canonicalEvaluationJson,
  };
}
