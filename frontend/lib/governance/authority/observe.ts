import { observeAuthorityDecisionFailOpen } from "./service";
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

export function emitAuthorityObserveDecision(input: EmitAuthorityObserveInput) {
  const reasonCodes = Array.from(
    new Set((input.reasonCodes || []).map((entry) => String(entry || "").trim()).filter(Boolean))
  ).sort();

  void observeAuthorityDecisionFailOpen({
    tenantId: String(input.tenantId || "").trim() || null,
    policyId: String(input.policyId || "").trim(),
    policyVersionHash: String(input.policyVersionHash || "").trim() || undefined,
    subjectActorId: String(input.subjectActorId || "").trim() || "unknown_subject",
    requestActorId: String(input.requestActorId || "").trim() || "unknown_request_actor",
    requestActorRole: normalizeRole(input.requestActorRole),
    resource: String(input.resource || "").trim(),
    action: String(input.action || "").trim(),
    observedDecision: input.observedDecision,
    reasonCodes,
    approverActorId: String(input.approverActorId || "").trim() || null,
    approverActorRole: String(input.approverActorRole || "").trim()
      ? normalizeRole(input.approverActorRole)
      : null,
    delegationId: String(input.delegationId || "").trim() || null,
    sessionId: String(input.sessionId || "").trim() || null,
    elevationHash: String(input.elevationHash || "").trim().toLowerCase() || null,
    decidedAtUtc: input.decidedAtUtc,
    metadata: input.metadata,
  }).catch(() => {
    // Observe mode is explicitly fail-open and must never block caller flows.
  });
}
