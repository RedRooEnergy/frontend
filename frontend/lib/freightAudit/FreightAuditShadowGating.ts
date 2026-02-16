import type { RunFreightAuditForEventOutcome } from "./FreightAuditService";
import type { FreightAuditTriggerEvent } from "./FreightAuditRules";

export const FREIGHT_SHADOW_GATE_POLICY_VERSION = "freight-shadow-gate.v1" as const;

export type FreightShadowGateScope = "LIFECYCLE_PROGRESS" | "ESCROW_SETTLEMENT" | "PAYOUT_RELEASE";
export type FreightShadowGateDecisionStatus = "WOULD_ALLOW" | "WOULD_BLOCK";
export type FreightShadowGateReasonCode = "NO_BLOCKING_FAILURES" | "BLOCKING_FAILURES_PRESENT" | "AUDIT_RUN_FAILED";

export type FreightShadowGateDecision = {
  policyVersion: typeof FREIGHT_SHADOW_GATE_POLICY_VERSION;
  observedAtUtc: string;
  triggerEvent: FreightAuditTriggerEvent;
  runId: string | null;
  ruleSetVersion: string;
  outcomeStatus: RunFreightAuditForEventOutcome["status"];
  scope: FreightShadowGateScope;
  decision: FreightShadowGateDecisionStatus;
  wouldBlock: boolean;
  reasonCode: FreightShadowGateReasonCode;
  failedRules: number | null;
  criticalFailures: number | null;
  blockingFailures: number | null;
};

function scopeForTrigger(triggerEvent: FreightAuditTriggerEvent): FreightShadowGateScope {
  if (triggerEvent === "ESCROW_ELIGIBLE") return "ESCROW_SETTLEMENT";
  if (triggerEvent === "PAYOUT_READY") return "PAYOUT_RELEASE";
  return "LIFECYCLE_PROGRESS";
}

export function deriveFreightShadowGateDecision(params: {
  triggerEvent: FreightAuditTriggerEvent;
  outcome: RunFreightAuditForEventOutcome;
  observedAtUtc?: string;
}): FreightShadowGateDecision {
  const observedAtUtc = params.observedAtUtc || new Date().toISOString();

  if (params.outcome.status === "FAILED") {
    return {
      policyVersion: FREIGHT_SHADOW_GATE_POLICY_VERSION,
      observedAtUtc,
      triggerEvent: params.triggerEvent,
      runId: params.outcome.runId,
      ruleSetVersion: params.outcome.ruleSetVersion,
      outcomeStatus: params.outcome.status,
      scope: scopeForTrigger(params.triggerEvent),
      decision: "WOULD_BLOCK",
      wouldBlock: true,
      reasonCode: "AUDIT_RUN_FAILED",
      failedRules: null,
      criticalFailures: null,
      blockingFailures: null,
    };
  }

  const wouldBlock = params.outcome.summary.blockingFailures > 0;
  return {
    policyVersion: FREIGHT_SHADOW_GATE_POLICY_VERSION,
    observedAtUtc,
    triggerEvent: params.triggerEvent,
    runId: params.outcome.runId,
    ruleSetVersion: params.outcome.ruleSetVersion,
    outcomeStatus: params.outcome.status,
    scope: scopeForTrigger(params.triggerEvent),
    decision: wouldBlock ? "WOULD_BLOCK" : "WOULD_ALLOW",
    wouldBlock,
    reasonCode: wouldBlock ? "BLOCKING_FAILURES_PRESENT" : "NO_BLOCKING_FAILURES",
    failedRules: params.outcome.summary.failedRules,
    criticalFailures: params.outcome.summary.criticalFailures,
    blockingFailures: params.outcome.summary.blockingFailures,
  };
}
