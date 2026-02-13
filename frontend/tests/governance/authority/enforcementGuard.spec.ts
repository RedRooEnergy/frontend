import { evaluateAuthorityEnforcementGuard } from "../../../lib/governance/authority/enforcementGuard";
import type { AuthorityShadowMetricsReport } from "../../../lib/governance/authority/shadowTypes";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function buildReport(summaryOverrides: Partial<AuthorityShadowMetricsReport["summary"]> = {}): AuthorityShadowMetricsReport {
  return {
    reportVersion: "gov04-authority-shadow-metrics.v1",
    generatedAtUtc: "2026-02-13T12:00:00.000Z",
    windowStartUtc: "2026-02-13T11:45:00.000Z",
    windowEndUtc: "2026-02-13T12:00:00.000Z",
    source: "api_internal",
    filters: {
      fromUtc: "2026-02-13T11:45:00.000Z",
      toUtc: "2026-02-13T12:00:00.000Z",
      limit: 500,
    },
    summary: {
      decisionsTotal: 1000,
      wouldBlockTotal: 10,
      policyConflictTotal: 8,
      enforcementDecisionsTotal: 1000,
      shadowVsEnforcementDivergenceTotal: 0,
      shadowVsEnforcementDivergenceRate: 0,
      casesOpenedTotal: 10,
      openCaseBacklog: 3,
      deterministicMismatchTotal: 0,
      deterministicMismatchRate: 0,
      ...summaryOverrides,
    },
    series: {
      wouldDecisionCounts: [
        { wouldDecision: "WOULD_ALLOW", count: 990 },
        { wouldDecision: "WOULD_BLOCK", count: 10 },
      ],
      policyConflictCounts: [{ policyConflictCode: "NO_ACTIVE_POLICY", count: 8 }],
    },
    deterministicHashSha256: "a".repeat(64),
  };
}

async function testOkWhenSignalsBelowWarnThresholds() {
  const result = evaluateAuthorityEnforcementGuard(buildReport());
  assert(result.overallStatus === "OK", "Expected OK status");
  assert(result.rollbackRecommended === false, "Expected no rollback recommendation");
}

async function testDeterministicMismatchPagesImmediately() {
  const report = buildReport({
    deterministicMismatchTotal: 1,
    deterministicMismatchRate: 0.001,
  });
  const result = evaluateAuthorityEnforcementGuard(report);
  assert(result.overallStatus === "PAGE", "Expected PAGE on deterministic mismatch");
  assert(result.rollbackRecommended === true, "Expected rollback recommendation on deterministic mismatch");
}

async function testDivergenceRatePagesAtThreshold() {
  const report = buildReport({
    shadowVsEnforcementDivergenceTotal: 6,
    shadowVsEnforcementDivergenceRate: 0.006,
  });
  const result = evaluateAuthorityEnforcementGuard(report);
  const divergenceSignal = result.signals.find((signal) => signal.signalCode === "SHADOW_VS_ENFORCEMENT_DIVERGENCE_RATE");
  assert(Boolean(divergenceSignal), "Expected divergence signal");
  assert(divergenceSignal?.status === "PAGE", "Expected PAGE for divergence above threshold");
  assert(result.rollbackRecommended, "Expected rollback recommendation on divergence PAGE");
}

async function testPolicyVersionUnresolvedWarn() {
  const report = buildReport({
    policyConflictTotal: 10,
  });
  report.series.policyConflictCounts = [{ policyConflictCode: "POLICY_VERSION_UNRESOLVED", count: 8 }];
  const result = evaluateAuthorityEnforcementGuard(report);
  const unresolvedSignal = result.signals.find((signal) => signal.signalCode === "POLICY_VERSION_UNRESOLVED_RATE");
  assert(Boolean(unresolvedSignal), "Expected unresolved signal");
  assert(unresolvedSignal?.status === "WARN", "Expected WARN for unresolved rate above warn threshold");
}

async function run() {
  await testOkWhenSignalsBelowWarnThresholds();
  await testDeterministicMismatchPagesImmediately();
  await testDivergenceRatePagesAtThreshold();
  await testPolicyVersionUnresolvedWarn();
}

run();
