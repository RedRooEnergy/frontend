export type ComplianceWorkflowState =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "EVIDENCE_REQUESTED"
  | "EVIDENCE_SUBMITTED"
  | "CERTIFIED"
  | "REJECTED"
  | "EXPIRED"
  | "SUSPENDED"
  | "WITHDRAWN";

export type ComplianceWorkflowTrigger =
  | "SUBMIT"
  | "ACKNOWLEDGE_REVIEW"
  | "REQUEST_EVIDENCE"
  | "SUBMIT_EVIDENCE"
  | "RESUME_REVIEW"
  | "CERTIFY"
  | "REJECT"
  | "EXPIRE"
  | "SUSPEND"
  | "REINSTATE"
  | "WITHDRAW"
  | "REOPEN";

export type ComplianceWorkflowActor =
  | "MANUFACTURER"
  | "COMPLIANCE_AGENCY"
  | "ADMIN"
  | "REGULATOR"
  | "SYSTEM";

export type ComplianceWorkflowTransition = {
  from: ComplianceWorkflowState;
  to: ComplianceWorkflowState;
  trigger: ComplianceWorkflowTrigger;
  actor: ComplianceWorkflowActor;
};

export const COMPLIANCE_WORKFLOW_TRANSITIONS: ComplianceWorkflowTransition[] = [
  { from: "DRAFT", to: "SUBMITTED", trigger: "SUBMIT", actor: "MANUFACTURER" },
  { from: "SUBMITTED", to: "IN_REVIEW", trigger: "ACKNOWLEDGE_REVIEW", actor: "COMPLIANCE_AGENCY" },
  { from: "IN_REVIEW", to: "EVIDENCE_REQUESTED", trigger: "REQUEST_EVIDENCE", actor: "COMPLIANCE_AGENCY" },
  { from: "EVIDENCE_REQUESTED", to: "EVIDENCE_SUBMITTED", trigger: "SUBMIT_EVIDENCE", actor: "MANUFACTURER" },
  { from: "EVIDENCE_SUBMITTED", to: "IN_REVIEW", trigger: "RESUME_REVIEW", actor: "COMPLIANCE_AGENCY" },
  { from: "IN_REVIEW", to: "CERTIFIED", trigger: "CERTIFY", actor: "COMPLIANCE_AGENCY" },
  { from: "IN_REVIEW", to: "REJECTED", trigger: "REJECT", actor: "COMPLIANCE_AGENCY" },
  { from: "CERTIFIED", to: "EXPIRED", trigger: "EXPIRE", actor: "SYSTEM" },
  { from: "CERTIFIED", to: "SUSPENDED", trigger: "SUSPEND", actor: "ADMIN" },
  { from: "SUSPENDED", to: "CERTIFIED", trigger: "REINSTATE", actor: "ADMIN" },
  { from: "DRAFT", to: "WITHDRAWN", trigger: "WITHDRAW", actor: "MANUFACTURER" },
  { from: "SUBMITTED", to: "WITHDRAWN", trigger: "WITHDRAW", actor: "MANUFACTURER" },
  { from: "EVIDENCE_REQUESTED", to: "WITHDRAWN", trigger: "WITHDRAW", actor: "MANUFACTURER" },
  { from: "REJECTED", to: "DRAFT", trigger: "REOPEN", actor: "MANUFACTURER" },
];

export type ComplianceWorkflowContext = {
  workflowId: string;
  productId?: string;
  supplierId?: string;
  compliancePartnerId?: string;
  evidenceRefs?: string[];
  issuedCertificateId?: string;
};

export type ComplianceWorkflowGuardResult = { ok: true } | { ok: false; reason: string };

export function listAllowedTransitions(state: ComplianceWorkflowState) {
  return COMPLIANCE_WORKFLOW_TRANSITIONS.filter((t) => t.from === state);
}

export function isTransitionAllowed(
  from: ComplianceWorkflowState,
  to: ComplianceWorkflowState,
  actor: ComplianceWorkflowActor
) {
  return COMPLIANCE_WORKFLOW_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.actor === actor
  );
}

export function canTransition(
  from: ComplianceWorkflowState,
  to: ComplianceWorkflowState,
  actor: ComplianceWorkflowActor,
  _context: ComplianceWorkflowContext
): ComplianceWorkflowGuardResult {
  if (!isTransitionAllowed(from, to, actor)) {
    return { ok: false, reason: "Transition not permitted by governance rules." };
  }
  // TODO: enforce evidence requirements per transition.
  return { ok: true };
}

export function applyTransition(
  from: ComplianceWorkflowState,
  to: ComplianceWorkflowState,
  actor: ComplianceWorkflowActor,
  context: ComplianceWorkflowContext
) {
  const guard = canTransition(from, to, actor, context);
  if (!guard.ok) {
    throw new Error("reason" in guard ? guard.reason : "Transition not permitted.");
  }
  return {
    workflowId: context.workflowId,
    previousState: from,
    nextState: to,
    actor,
    occurredAt: new Date().toISOString(),
    evidenceRefs: context.evidenceRefs || [],
    issuedCertificateId: context.issuedCertificateId || null,
  };
}
