import {
  executePayoutWithSoftEnforcement,
  overridePayoutSettlementHold,
  type FreightSoftEnforcementDependencies,
} from "../../lib/freightAudit/FreightSoftEnforcementService";
import type { RunFreightAuditForEventOutcome } from "../../lib/freightAudit/FreightAuditService";
import type { FreightSettlementHold } from "../../lib/freightAudit/FreightSettlementHoldStore";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function completedOutcome(blockingFailures: number, criticalFailures: number): RunFreightAuditForEventOutcome {
  return {
    status: "COMPLETED",
    runId: "freight-audit-20260212120000000-aaaaaaaaaaaa",
    triggerEvent: "PAYOUT_READY",
    ruleSetVersion: "freight-audit-rules.v1.0.0",
    contextSnapshotHash: "a".repeat(64),
    startedAtUtc: "2026-02-12T12:00:00.000Z",
    closedAtUtc: "2026-02-12T12:00:01.000Z",
    summary: {
      totalRules: 2,
      failedRules: blockingFailures > 0 ? 1 : 0,
      criticalFailures,
      blockingFailures,
    },
    persistedResultCount: 2,
    persistedEvidenceCount: 0,
  };
}

function buildHold(overrides: Partial<FreightSettlementHold> = {}): FreightSettlementHold {
  return {
    holdId: "freight-hold-20260212120100000-aaaaaaaaaaaa",
    tenantId: "tenant-a",
    orderId: "ORD-100",
    shipmentId: null,
    triggerEvent: "PAYOUT_READY",
    runId: "freight-audit-20260212120000000-aaaaaaaaaaaa",
    ruleSetVersion: "freight-audit-rules.v1.0.0",
    shadowPolicyVersion: "freight-shadow-gate.v1",
    reasonCode: "BLOCKING_FAILURES_PRESENT",
    blockingFailures: 1,
    criticalFailures: 1,
    status: "REVIEW_REQUIRED",
    createdAtUtc: "2026-02-12T12:01:00.000Z",
    createdByRole: "system",
    createdById: "admin-1",
    linkedExceptionId: "freight-exc-1",
    overrideApprovalId: null,
    overrideEvidenceManifestHash: null,
    overrideRationale: null,
    overrideRecordedAtUtc: null,
    idempotencyKey: "tenant-a:ORD-100:PAYOUT_READY:freight-audit-20260212120000000-aaaaaaaaaaaa",
    createdAt: "2026-02-12T12:01:00.000Z",
    updatedAt: "2026-02-12T12:01:00.000Z",
    ...overrides,
  };
}

function makeDeps(state: {
  pilotEnabled: boolean;
  pilotTenants: Set<string>;
  latestHold: FreightSettlementHold | null;
  holdCreateResult?: { hold: FreightSettlementHold; created: boolean };
  auditOutcome: RunFreightAuditForEventOutcome;
}) {
  const logs: Array<{ level: "info" | "warn" | "error"; message: string; data: Record<string, unknown> }> = [];
  let runAuditCalls = 0;
  let createHoldCalls = 0;
  let recordDecisionCalls = 0;
  const holds = new Map<string, FreightSettlementHold>();

  if (state.latestHold) {
    holds.set(state.latestHold.holdId, state.latestHold);
  }

  const deps: Partial<FreightSoftEnforcementDependencies> = {
    now: () => new Date("2026-02-12T12:01:00.000Z"),
    randomUUID: () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    isPilotEnabled: () => state.pilotEnabled,
    getPilotTenants: () => state.pilotTenants,
    getPilotTrigger: () => "PAYOUT_READY",
    runAudit: async () => {
      runAuditCalls += 1;
      return state.auditOutcome;
    },
    getLatestHold: async () => {
      const latest = Array.from(holds.values())
        .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc) || b.holdId.localeCompare(a.holdId))
        .shift();
      return latest || null;
    },
    createHold: async (input) => {
      createHoldCalls += 1;
      const created = state.holdCreateResult?.created ?? true;
      const hold = state.holdCreateResult?.hold || buildHold({ holdId: input.holdId, orderId: input.orderId });
      holds.set(hold.holdId, hold);
      return { hold, created };
    },
    openCaseFromAuditOutcome: async () => ({
      opened: true,
      exceptionCase: {
        exceptionId: "freight-exc-1",
      } as any,
      openedEvent: {} as any,
    }),
    getHold: async (holdId: string) => holds.get(holdId) || null,
    getAuditRun: async (runId: string) => ({
      runId,
      triggerEvent: "PAYOUT_READY",
      ruleSetVersion: "freight-audit-rules.v1.0.0",
      contextSnapshotHash: "a".repeat(64),
      startedAt: "2026-02-12T12:00:00.000Z",
      closedAt: "2026-02-12T12:00:01.000Z",
      updatedAt: "2026-02-12T12:00:01.000Z",
      summary: {
        totalRules: 2,
        failedRules: 1,
        criticalFailures: 1,
        blockingFailures: 1,
      },
    } as any),
    overrideHold: async (input) => {
      const existing = holds.get(input.holdId);
      if (!existing) throw new Error("FREIGHT_SETTLEMENT_HOLD_NOT_FOUND");
      const next = {
        ...existing,
        status: "OVERRIDDEN" as const,
        linkedExceptionId: input.linkedExceptionId || existing.linkedExceptionId || null,
        overrideApprovalId: input.approvalId,
        overrideRationale: input.rationale,
        overrideEvidenceManifestHash: input.evidenceManifestHash,
        overrideRecordedAtUtc: input.recordedAtUtc || "2026-02-12T12:02:00.000Z",
      };
      holds.set(next.holdId, next);
      return next;
    },
    recordAdminDecision: async () => {
      recordDecisionCalls += 1;
      return {
        override: { overrideId: "ovr-1" },
        decisionEvent: { eventId: "evt-1" },
        closedEvent: null,
        exceptionCase: { exceptionId: "freight-exc-1" },
      } as any;
    },
    logger: {
      info(message, data) {
        logs.push({ level: "info", message, data });
      },
      warn(message, data) {
        logs.push({ level: "warn", message, data });
      },
      error(message, data) {
        logs.push({ level: "error", message, data });
      },
    },
  };

  return {
    deps,
    logs,
    stats: {
      get runAuditCalls() {
        return runAuditCalls;
      },
      get createHoldCalls() {
        return createHoldCalls;
      },
      get recordDecisionCalls() {
        return recordDecisionCalls;
      },
    },
    holds,
  };
}

async function testPilotTenantCreatesReviewRequiredHoldAndSkipsPayoutExecution() {
  const { deps, stats } = makeDeps({
    pilotEnabled: true,
    pilotTenants: new Set(["tenant-a"]),
    latestHold: null,
    auditOutcome: completedOutcome(1, 1),
  });
  let payoutCalls = 0;

  const outcome = await executePayoutWithSoftEnforcement(
    {
      source: "test.soft-enforcement",
      tenantId: "tenant-a",
      orderId: "ORD-100",
      actorId: "admin-1",
      actorRole: "admin",
      context: { orderId: "ORD-100" },
      executePayout: async () => {
        payoutCalls += 1;
        return { ok: true };
      },
    },
    deps
  );

  assert(outcome.status === "REVIEW_REQUIRED", "Expected REVIEW_REQUIRED outcome");
  assert(stats.createHoldCalls === 1, "Expected one hold creation");
  assert(payoutCalls === 0, "Payout execution must not run while REVIEW_REQUIRED");
}

async function testRetryReturnsExistingReviewRequiredHold() {
  const hold = buildHold();
  const { deps, stats } = makeDeps({
    pilotEnabled: true,
    pilotTenants: new Set(["tenant-a"]),
    latestHold: hold,
    auditOutcome: completedOutcome(1, 1),
  });
  let payoutCalls = 0;

  const outcome = await executePayoutWithSoftEnforcement(
    {
      source: "test.soft-enforcement",
      tenantId: "tenant-a",
      orderId: hold.orderId,
      actorId: "admin-1",
      actorRole: "admin",
      context: { orderId: hold.orderId },
      executePayout: async () => {
        payoutCalls += 1;
        return { ok: true };
      },
    },
    deps
  );

  assert(outcome.status === "REVIEW_REQUIRED", "Expected REVIEW_REQUIRED on retry");
  assert(stats.createHoldCalls === 0, "Expected no second hold creation");
  assert(payoutCalls === 0, "Payout execution must remain blocked in review-required state");
}

async function testOverrideThenPayoutProceeds() {
  const hold = buildHold();
  const { deps, stats, holds, logs } = makeDeps({
    pilotEnabled: true,
    pilotTenants: new Set(["tenant-a"]),
    latestHold: hold,
    auditOutcome: completedOutcome(1, 1),
  });

  await overridePayoutSettlementHold(
    {
      holdId: hold.holdId,
      approvalId: "APP-001",
      rationale: "Approved by duty manager",
      evidenceManifestHash: "f".repeat(64),
      actorId: "admin-1",
      actorRole: "admin",
    },
    deps
  );

  const overridden = holds.get(hold.holdId);
  assert(overridden?.status === "OVERRIDDEN", "Expected hold to become OVERRIDDEN");
  assert(stats.recordDecisionCalls === 1, "Expected one ALLOW_PAYOUT decision record");

  let payoutCalls = 0;
  const outcome = await executePayoutWithSoftEnforcement(
    {
      source: "test.soft-enforcement",
      tenantId: "tenant-a",
      orderId: hold.orderId,
      actorId: "admin-1",
      actorRole: "admin",
      context: { orderId: hold.orderId },
      executePayout: async () => {
        payoutCalls += 1;
        return { ok: true };
      },
    },
    deps
  );

  assert(outcome.status === "PROCEEDED", "Expected payout to proceed after override");
  assert(payoutCalls === 1, "Expected payout execution after override");
  assert(
    logs.some((entry) => entry.message === "freight_soft_enforcement_payout_proceeded_after_override"),
    "Expected proceeded-after-override log"
  );
}

async function testNonPilotTenantUnaffected() {
  const { deps, stats } = makeDeps({
    pilotEnabled: true,
    pilotTenants: new Set(["tenant-a"]),
    latestHold: null,
    auditOutcome: completedOutcome(1, 1),
  });

  let payoutCalls = 0;
  const outcome = await executePayoutWithSoftEnforcement(
    {
      source: "test.soft-enforcement",
      tenantId: "tenant-b",
      orderId: "ORD-200",
      actorId: "admin-1",
      actorRole: "admin",
      context: { orderId: "ORD-200" },
      executePayout: async () => {
        payoutCalls += 1;
        return { ok: true };
      },
    },
    deps
  );

  assert(outcome.status === "PROCEEDED", "Expected payout to proceed for non-pilot tenant");
  assert(stats.runAuditCalls === 0, "Expected no audit execution for non-pilot tenant");
  assert(payoutCalls === 1, "Expected payout execution for non-pilot tenant");
}

async function run() {
  await testPilotTenantCreatesReviewRequiredHoldAndSkipsPayoutExecution();
  await testRetryReturnsExistingReviewRequiredHold();
  await testOverrideThenPayoutProceeds();
  await testNonPilotTenantUnaffected();
}

run();
