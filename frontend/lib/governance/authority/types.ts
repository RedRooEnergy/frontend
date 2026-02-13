export type AuthorityActorRole =
  | "admin"
  | "regulator"
  | "freight"
  | "supplier"
  | "service-partner"
  | "buyer"
  | "system";

export type AuthorityPolicyLifecycleState = "ACTIVE" | "DEPRECATED" | "REVOKED";

export type AuthorityDelegationEventType =
  | "DELEGATION_GRANTED"
  | "DELEGATION_REVOKED"
  | "DELEGATION_EXPIRED"
  | "LEGACY_IMPORT";

export type AuthorityDecisionType = "APPROVED" | "DENIED" | "OBSERVED_ALLOW" | "OBSERVED_DENY";

export type AuthorityObserveDecision = "WOULD_ALLOW" | "WOULD_DENY";

export type AuthorityPolicyVersionRecord = {
  _id?: string;
  policyVersionId: string;
  policyId: string;
  policyVersionHash: string;
  policySchemaVersion: string;
  canonicalPolicyJson: string;
  createdAtUtc: string;
  createdByRole: AuthorityActorRole;
  createdById: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type AuthorityPolicyLifecycleEventRecord = {
  _id?: string;
  eventId: string;
  policyId: string;
  policyVersionHash: string;
  lifecycleState: AuthorityPolicyLifecycleState;
  reasonCode?: string | null;
  eventAtUtc: string;
  actorRole: AuthorityActorRole;
  actorId: string;
  eventHashSha256: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  createdAtUtc: string;
};

export type AuthorityDelegationConstraints = Record<string, unknown>;

export type AuthorityDelegationEventRecord = {
  _id?: string;
  eventId: string;
  delegationId: string;
  eventType: AuthorityDelegationEventType;
  tenantId?: string | null;
  grantorActorId: string;
  grantorActorRole?: AuthorityActorRole | null;
  granteeActorId: string;
  granteeActorRole?: AuthorityActorRole | null;
  resource: string;
  action: string;
  constraints?: AuthorityDelegationConstraints;
  scopeHashSha256: string;
  validFromUtc?: string | null;
  validToUtc?: string | null;
  approvalId?: string | null;
  eventAtUtc: string;
  actorRole: AuthorityActorRole;
  actorId: string;
  eventHashSha256: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  createdAtUtc: string;
};

export type AuthorityActorChain = {
  requestActorId: string;
  requestActorRole: AuthorityActorRole;
  approverActorId?: string | null;
  approverActorRole?: AuthorityActorRole | null;
  delegationId?: string | null;
  policyVersionHash: string;
  sessionId?: string | null;
  elevationHash?: string | null;
};

export type AuthorityApprovalDecisionRecord = {
  _id?: string;
  decisionId: string;
  tenantId?: string | null;
  policyId: string;
  policyVersionHash: string;
  subjectActorId: string;
  requestActorId: string;
  approverActorId?: string | null;
  resource: string;
  action: string;
  decision: AuthorityDecisionType;
  reasonCodes: string[];
  approvalId?: string | null;
  actorChainHashSha256: string;
  decisionHashSha256: string;
  idempotencyKey: string;
  decidedAtUtc: string;
  metadata?: Record<string, unknown>;
  createdAtUtc: string;
};

export type AuthorityObserveDecisionInput = {
  tenantId?: string | null;
  policyId: string;
  policyVersionHash?: string;
  subjectActorId: string;
  requestActorId: string;
  requestActorRole: AuthorityActorRole;
  resource: string;
  action: string;
  observedDecision: AuthorityObserveDecision;
  reasonCodes?: string[];
  approverActorId?: string | null;
  approverActorRole?: AuthorityActorRole | null;
  delegationId?: string | null;
  sessionId?: string | null;
  elevationHash?: string | null;
  decidedAtUtc?: string;
  metadata?: Record<string, unknown>;
};

export type AuthorityExportReport = {
  reportVersion: "gov04-authority-export.v1";
  generatedAtUtc: string;
  windowStartUtc: string;
  windowEndUtc: string;
  filters: {
    fromUtc: string;
    toUtc: string;
    limit: number;
    tenantId?: string;
    policyId?: string;
    source: "api_internal" | "cli_local" | "cli_http";
  };
  summary: {
    policyVersions: number;
    policyLifecycleEvents: number;
    delegationEvents: number;
    approvalDecisions: number;
    eventsInHashChain: number;
  };
  policyVersions: AuthorityPolicyVersionRecord[];
  policyLifecycleEvents: AuthorityPolicyLifecycleEventRecord[];
  delegationEvents: AuthorityDelegationEventRecord[];
  approvalDecisions: AuthorityApprovalDecisionRecord[];
  hashChain: Array<{
    index: number;
    artifactClass: string;
    artifactId: string;
    eventAtUtc: string;
    eventHashSha256: string;
    chainHashSha256: string;
  }>;
  deterministicHashSha256: string;
  exportRootHash: string;
  signatures: {
    scheme: "INTERNAL_UNSIGNED_V1";
    signedAtUtc: string;
    exportRootHash: string;
    signatureRef: string | null;
  };
};
