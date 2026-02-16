import { deriveFreightShadowGateDecision } from "../../lib/freightAudit/FreightAuditShadowGating";
import type { RunFreightAuditForEventOutcome } from "../../lib/freightAudit/FreightAuditService";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function completedOutcome(triggerEvent: "ESCROW_ELIGIBLE" | "PAYOUT_READY" | "BOOKED", blockingFailures: number) {
  return {
    status: "COMPLETED",
    runId: "freight-audit-20260212120000000-aaaaaaaaaaaa",
    triggerEvent,
    ruleSetVersion: "freight-audit-rules.v1.0.0",
    contextSnapshotHash: "a".repeat(64),
    startedAtUtc: "2026-02-12T12:00:00.000Z",
    closedAtUtc: "2026-02-12T12:00:01.000Z",
    summary: {
      totalRules: 2,
      failedRules: blockingFailures > 0 ? 1 : 0,
      criticalFailures: blockingFailures > 0 ? 1 : 0,
      blockingFailures,
    },
    persistedResultCount: 2,
    persistedEvidenceCount: 0,
  } satisfies RunFreightAuditForEventOutcome;
}

async function testCompletedAllowDecision() {
  const decision = deriveFreightShadowGateDecision({
    triggerEvent: "ESCROW_ELIGIBLE",
    outcome: completedOutcome("ESCROW_ELIGIBLE", 0),
    observedAtUtc: "2026-02-12T12:05:00.000Z",
  });

  assert(decision.decision === "WOULD_ALLOW", "Expected allow decision");
  assert(decision.scope === "ESCROW_SETTLEMENT", "Expected escrow scope");
  assert(decision.reasonCode === "NO_BLOCKING_FAILURES", "Expected no-blocking reason");
}

async function testCompletedBlockDecision() {
  const decision = deriveFreightShadowGateDecision({
    triggerEvent: "PAYOUT_READY",
    outcome: completedOutcome("PAYOUT_READY", 1),
    observedAtUtc: "2026-02-12T12:06:00.000Z",
  });

  assert(decision.decision === "WOULD_BLOCK", "Expected block decision");
  assert(decision.scope === "PAYOUT_RELEASE", "Expected payout scope");
  assert(decision.reasonCode === "BLOCKING_FAILURES_PRESENT", "Expected blocking reason");
  assert(decision.blockingFailures === 1, "Expected blocking failure count");
}

async function testFailedDecision() {
  const decision = deriveFreightShadowGateDecision({
    triggerEvent: "BOOKED",
    outcome: {
      status: "FAILED",
      runId: "freight-audit-20260212120000000-bbbbbbbbbbbb",
      triggerEvent: "BOOKED",
      ruleSetVersion: "freight-audit-rules.v1.0.0",
      contextSnapshotHash: "b".repeat(64),
      errorCode: "MONGO_TIMEOUT",
      errorMessage: "Timed out",
    },
    observedAtUtc: "2026-02-12T12:07:00.000Z",
  });

  assert(decision.decision === "WOULD_BLOCK", "Expected failed audit to block in shadow mode");
  assert(decision.scope === "LIFECYCLE_PROGRESS", "Expected lifecycle scope");
  assert(decision.reasonCode === "AUDIT_RUN_FAILED", "Expected failed-run reason");
  assert(decision.blockingFailures === null, "Expected null blocking summary for failed audits");
}

async function run() {
  await testCompletedAllowDecision();
  await testCompletedBlockDecision();
  await testFailedDecision();
}

run();
