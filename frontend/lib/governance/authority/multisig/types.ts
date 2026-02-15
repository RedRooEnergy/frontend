export type AuthorityMultisigProposalClass =
  | "DESIGN_STRUCTURE_CHANGE"
  | "CORE_BOUNDARY_CHANGE"
  | "GOVERNANCE_METADATA_UPDATE";

export type AuthorityMultisigProposalState =
  | "DRAFT"
  | "SUBMITTED"
  | "COUNCIL_REVIEW"
  | "QUORUM_MET"
  | "RATIFICATION_PENDING"
  | "RATIFIED"
  | "REJECTED"
  | "EXPIRED"
  | "WITHDRAWN";

export type AuthorityMultisigDecision = "APPROVE" | "REJECT";

export type AuthorityMultisigActor = {
  actorId: string;
  actorRole: "admin" | "regulator" | "freight" | "supplier" | "service-partner" | "buyer" | "system";
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type AuthorityMultisigProposalRecord = {
  proposalId: string;
  proposalType: AuthorityMultisigProposalClass;
  scope: string;
  submittedBy: {
    actorId: string;
    actorRole: string;
  };
  createdAtUtc: string;
  status: AuthorityMultisigProposalState;
  evidenceRefs: Array<{ type: string; refId: string; hash?: string }>;
  proposedChangesHash: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type AuthorityMultisigApprovalEntryRecord = {
  entryId: string;
  proposalId: string;
  approverId: string;
  approverRole: string;
  decision: AuthorityMultisigDecision;
  reason: string;
  signedAtUtc: string;
  entryHash: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type AuthorityMultisigQuorumSnapshotRecord = {
  snapshotId: string;
  proposalId: string;
  requiredApprovals: number;
  currentApprovals: number;
  quorumMet: boolean;
  computedAtUtc: string;
  snapshotHash: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export class AuthorityMultisigBuildOnlyError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
