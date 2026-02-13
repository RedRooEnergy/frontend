import { observeAuthorityDecisionFailOpen } from "./service";
import { dispatchAuthorityShadowDecisionFailOpen } from "./shadowService";
import type { AuthorityActorRole, AuthorityObserveDecisionInput } from "./types";

function normalizeRole(role: string | null | undefined): AuthorityActorRole {
  const value = String(role || "").trim().toLowerCase();
  if (value === "admin") return "admin";
  if (value === "regulator") return "regulator";
  if (value === "freight") return "freight";
  if (value === "supplier") return "supplier";
  if (value === "service-partner" || value === "service_partner") return "service-partner";
  if (value === "buyer") return "buyer";
  return "system";
}

export type EmitAuthorityObserveInput = {
  tenantId?: string | null;
  policyId: string;
  policyVersionHash?: string;
  subjectActorId: string;
  requestActorId: string;
  requestActorRole: string | AuthorityActorRole;
  resource: string;
  action: string;
  observedDecision: AuthorityObserveDecisionInput["observedDecision"];
  reasonCodes?: string[];
  approverActorId?: string | null;
  approverActorRole?: string | null;
  delegationId?: string | null;
  sessionId?: string | null;
  elevationHash?: string | null;
  decidedAtUtc?: string;
  metadata?: Record<string, unknown>;
};

type ShadowDispatch = typeof dispatchAuthorityShadowDecisionFailOpen;

let shadowDispatcher: ShadowDispatch = dispatchAuthorityShadowDecisionFailOpen;

export function __setAuthorityShadowDispatcherForTests(dispatcher?: ShadowDispatch) {
  shadowDispatcher = dispatcher || dispatchAuthorityShadowDecisionFailOpen;
}

export function emitAuthorityObserveDecision(input: EmitAuthorityObserveInput) {
  const reasonCodes = Array.from(
    new Set((input.reasonCodes || []).map((entry) => String(entry || "").trim()).filter(Boolean))
  ).sort();

  const normalizedRole = normalizeRole(input.requestActorRole);
  const normalizedPolicyId = String(input.policyId || "").trim();
  const normalizedTenantId = String(input.tenantId || "").trim() || null;
  const normalizedSubjectActorId = String(input.subjectActorId || "").trim() || "unknown_subject";
  const normalizedRequestActorId = String(input.requestActorId || "").trim() || "unknown_request_actor";
  const normalizedResource = String(input.resource || "").trim();
  const normalizedAction = String(input.action || "").trim();
  const normalizedPolicyVersionHash = String(input.policyVersionHash || "").trim() || undefined;
  const normalizedApproverActorId = String(input.approverActorId || "").trim() || null;
  const normalizedApproverRole = String(input.approverActorRole || "").trim()
    ? normalizeRole(input.approverActorRole)
    : null;
  const normalizedDelegationId = String(input.delegationId || "").trim() || null;
  const normalizedSessionId = String(input.sessionId || "").trim() || null;
  const normalizedElevationHash = String(input.elevationHash || "").trim().toLowerCase() || null;

  void observeAuthorityDecisionFailOpen({
    tenantId: normalizedTenantId,
    policyId: normalizedPolicyId,
    policyVersionHash: normalizedPolicyVersionHash,
    subjectActorId: normalizedSubjectActorId,
    requestActorId: normalizedRequestActorId,
    requestActorRole: normalizedRole,
    resource: normalizedResource,
    action: normalizedAction,
    observedDecision: input.observedDecision,
    reasonCodes,
    approverActorId: normalizedApproverActorId,
    approverActorRole: normalizedApproverRole,
    delegationId: normalizedDelegationId,
    sessionId: normalizedSessionId,
    elevationHash: normalizedElevationHash,
    decidedAtUtc: input.decidedAtUtc,
    metadata: input.metadata,
  }).catch(() => {
    // Observe mode is explicitly fail-open and must never block caller flows.
  });

  void shadowDispatcher({
    tenantId: normalizedTenantId,
    policyId: normalizedPolicyId,
    policyVersionHash: normalizedPolicyVersionHash,
    subjectActorId: normalizedSubjectActorId,
    requestActorId: normalizedRequestActorId,
    requestActorRole: normalizedRole,
    approverActorId: normalizedApproverActorId,
    approverActorRole: normalizedApproverRole,
    delegationId: normalizedDelegationId,
    resource: normalizedResource,
    action: normalizedAction,
    requestedDecisionHint: input.observedDecision === "WOULD_DENY" ? "WOULD_BLOCK" : "WOULD_ALLOW",
    decidedAtUtc: input.decidedAtUtc || new Date().toISOString(),
    metadata: {
      source: "authority.observe_dispatch",
      observedDecisionHint: input.observedDecision,
      sessionId: normalizedSessionId,
      elevationHash: normalizedElevationHash,
      reasonCodes,
      ...(input.metadata || {}),
    },
  }).catch(() => {
    // Shadow mode is explicitly fail-open and must never block caller flows.
  });
}
