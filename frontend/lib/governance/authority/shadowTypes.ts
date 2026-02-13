import type { AuthorityActorRole } from "./types";

export const AUTHORITY_SHADOW_EVALUATOR_VERSION = "gov04-shadow-evaluator.v1" as const;

export type AuthorityShadowDecision = "WOULD_ALLOW" | "WOULD_BLOCK";

export type AuthorityShadowConflictCode =
  | "NO_ACTIVE_POLICY"
  | "MULTIPLE_ACTIVE_POLICIES"
  | "POLICY_VERSION_UNRESOLVED"
  | "POLICY_RULE_AMBIGUOUS"
  | "DELEGATION_SCOPE_CONFLICT"
  | "APPROVAL_SCOPE_CONFLICT";

export type AuthorityShadowCaseStatus = "OPEN" | "ACKNOWLEDGED" | "CLOSED";

export type AuthorityShadowCaseEventType =
  | "CASE_OPENED"
  | "CASE_ACKNOWLEDGED"
  | "CASE_CLOSED"
  | "DECISION_LINKED";

export type AuthorityShadowEvaluationInput = {
  tenantId?: string | null;
  policyId: string;
  policyVersionHash?: string;
  subjectActorId: string;
  requestActorId: string;
  requestActorRole: AuthorityActorRole;
  approverActorId?: string | null;
  approverActorRole?: AuthorityActorRole | null;
  delegationId?: string | null;
  resource: string;
  action: string;
  decidedAtUtc: string;
  requestedDecisionHint?: AuthorityShadowDecision;
  metadata?: Record<string, unknown>;
};

export type AuthorityShadowEvaluationResult = {
  policyId: string;
  policyVersionHash: string | null;
  policyLifecycleState: string | null;
  shadowEvaluatorVersion: typeof AUTHORITY_SHADOW_EVALUATOR_VERSION;
  wouldDecision: AuthorityShadowDecision;
  wouldBlock: boolean;
  reasonCodes: string[];
  policyConflictCode: AuthorityShadowConflictCode | null;
  delegationEvaluationResult: {
    required: boolean;
    hasValidDelegation: boolean;
    activeDelegationCount: number;
    delegationIds: string[];
  };
  approvalRequirementEvaluation: {
    required: boolean;
    hasApprover: boolean;
    passesSeparationOfDuties: boolean;
  };
  evaluationPayloadHashSha256: string;
  canonicalEvaluationJson: string;
};

export type AuthorityShadowDecisionRecord = {
  _id?: string;
  decisionId: string;
  caseKeyHashSha256: string;
  idempotencyKey: string;
  tenantId?: string | null;
  policyId: string;
  policyVersionHash: string | null;
  policyLifecycleState: string | null;
  subjectActorId: string;
  requestActorId: string;
  requestActorRole: AuthorityActorRole;
  approverActorId?: string | null;
  approverActorRole?: AuthorityActorRole | null;
  delegationId?: string | null;
  resource: string;
  action: string;
  wouldDecision: AuthorityShadowDecision;
  wouldBlock: boolean;
  reasonCodes: string[];
  policyConflictCode: AuthorityShadowConflictCode | null;
  delegationEvaluationResult: AuthorityShadowEvaluationResult["delegationEvaluationResult"];
  approvalRequirementEvaluation: AuthorityShadowEvaluationResult["approvalRequirementEvaluation"];
  shadowEvaluatorVersion: string;
  decisionHashSha256: string;
  canonicalDecisionJson: string;
  decidedAtUtc: string;
  metadata?: Record<string, unknown>;
  createdAtUtc: string;
};

export type AuthorityShadowOverrideCaseRecord = {
  _id?: string;
  caseId: string;
  caseKeyHashSha256: string;
  idempotencyKey: string;
  tenantId?: string | null;
  policyId: string;
  policyVersionHash: string | null;
  subjectActorId: string;
  resource: string;
  action: string;
  status: AuthorityShadowCaseStatus;
  openedByDecisionId: string;
  openedAtUtc: string;
  metadata?: Record<string, unknown>;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type AuthorityShadowOverrideCaseEventRecord = {
  _id?: string;
  eventId: string;
  caseId: string;
  caseKeyHashSha256: string;
  idempotencyKey: string;
  eventType: AuthorityShadowCaseEventType;
  priorStatus: AuthorityShadowCaseStatus | null;
  newStatus: AuthorityShadowCaseStatus;
  decisionId?: string | null;
  actorId: string;
  actorRole: AuthorityActorRole;
  reasonCode?: string | null;
  eventHashSha256: string;
  eventAtUtc: string;
  metadata?: Record<string, unknown>;
  createdAtUtc: string;
};

export type AuthorityShadowMetricsReport = {
  reportVersion: "gov04-authority-shadow-metrics.v1";
  generatedAtUtc: string;
  windowStartUtc: string;
  windowEndUtc: string;
  source: "api_internal" | "cli_local" | "cli_http";
  filters: {
    fromUtc: string;
    toUtc: string;
    limit: number;
    tenantId?: string;
    policyId?: string;
  };
  summary: {
    decisionsTotal: number;
    wouldBlockTotal: number;
    policyConflictTotal: number;
    enforcementDecisionsTotal: number;
    shadowVsEnforcementDivergenceTotal: number;
    shadowVsEnforcementDivergenceRate: number;
    casesOpenedTotal: number;
    openCaseBacklog: number;
    deterministicMismatchTotal: number;
    deterministicMismatchRate: number;
  };
  series: {
    wouldDecisionCounts: Array<{ wouldDecision: AuthorityShadowDecision; count: number }>;
    policyConflictCounts: Array<{ policyConflictCode: AuthorityShadowConflictCode; count: number }>;
  };
  deterministicHashSha256: string;
};
