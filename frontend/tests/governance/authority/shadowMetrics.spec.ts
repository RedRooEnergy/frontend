import { runAuthorityShadowMetricsSnapshot } from "../../../lib/governance/authority/shadowMetrics";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function testMetricsDeterminismAndMismatch() {
  const decisions = [
    {
      decisionId: "sd-1",
      wouldDecision: "WOULD_BLOCK",
      wouldBlock: true,
      policyConflictCode: "NO_ACTIVE_POLICY",
      decisionHashSha256: "f".repeat(64),
      canonicalDecisionJson: "{}",
      shadowEvaluatorVersion: "gov04-shadow-evaluator.v1",
    },
    {
      decisionId: "sd-2",
      wouldDecision: "WOULD_ALLOW",
      wouldBlock: false,
      policyConflictCode: null,
      decisionHashSha256: "a".repeat(64),
      canonicalDecisionJson: "{\"x\":1}",
      shadowEvaluatorVersion: "gov04-shadow-evaluator.v0",
    },
  ];

  const cases = [
    { caseId: "case-1", status: "OPEN" },
    { caseId: "case-2", status: "CLOSED" },
  ];

  const deps = {
    now: () => new Date("2026-02-13T12:00:00.000Z"),
    listDecisions: async () => decisions as any,
    listCases: async () => cases as any,
  };

  const first = await runAuthorityShadowMetricsSnapshot(
    {
      source: "cli_local",
      fromUtc: "2026-02-13T11:00:00.000Z",
      toUtc: "2026-02-13T12:00:00.000Z",
      limit: 100,
    },
    deps
  );
  const second = await runAuthorityShadowMetricsSnapshot(
    {
      source: "cli_local",
      fromUtc: "2026-02-13T11:00:00.000Z",
      toUtc: "2026-02-13T12:00:00.000Z",
      limit: 100,
    },
    deps
  );

  assert(first.summary.decisionsTotal === 2, "Expected decision count");
  assert(first.summary.wouldBlockTotal === 1, "Expected would-block count");
  assert(first.summary.casesOpenedTotal === 2, "Expected case count");
  assert(first.summary.openCaseBacklog === 1, "Expected open-case backlog count");
  assert(first.summary.deterministicMismatchTotal >= 1, "Expected mismatch detection");
  assert(first.deterministicHashSha256 === second.deterministicHashSha256, "Expected deterministic hash stability");
}

async function run() {
  await testMetricsDeterminismAndMismatch();
}

run();
