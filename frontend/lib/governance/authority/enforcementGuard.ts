import type { AuthorityShadowMetricsReport } from "./shadowTypes";

export type AuthorityEnforcementGuardSignalStatus = "OK" | "WARN" | "PAGE";

export type AuthorityEnforcementGuardSignal = {
  signalCode:
    | "CONFLICT_RATE"
    | "CASE_OPEN_RATE"
    | "DETERMINISTIC_MISMATCH"
    | "POLICY_VERSION_UNRESOLVED_RATE"
    | "SHADOW_VS_ENFORCEMENT_DIVERGENCE_RATE";
  value: number;
  warnThreshold: number;
  pageThreshold: number;
  status: AuthorityEnforcementGuardSignalStatus;
};

export type AuthorityEnforcementGuardThresholds = {
  conflictRateWarn: number;
  conflictRatePage: number;
  caseOpenRateWarn: number;
  caseOpenRatePage: number;
  policyVersionUnresolvedRateWarn: number;
  policyVersionUnresolvedRatePage: number;
  shadowVsEnforcementDivergenceRateWarn: number;
  shadowVsEnforcementDivergenceRatePage: number;
};

export type AuthorityEnforcementGuardResult = {
  evaluatedAtUtc: string;
  windowStartUtc: string;
  windowEndUtc: string;
  source: AuthorityShadowMetricsReport["source"];
  reportVersion: AuthorityShadowMetricsReport["reportVersion"];
  reportHashSha256: string;
  overallStatus: AuthorityEnforcementGuardSignalStatus;
  rollbackRecommended: boolean;
  killSwitchAction: "NONE" | "SET_GOV04_AUTH_ENFORCEMENT_KILL_SWITCH_TRUE";
  signals: AuthorityEnforcementGuardSignal[];
};

export const DEFAULT_AUTHORITY_ENFORCEMENT_GUARD_THRESHOLDS: AuthorityEnforcementGuardThresholds = {
  conflictRateWarn: 0.01,
  conflictRatePage: 0.03,
  caseOpenRateWarn: 0.02,
  caseOpenRatePage: 0.05,
  policyVersionUnresolvedRateWarn: 0.005,
  policyVersionUnresolvedRatePage: 0.01,
  shadowVsEnforcementDivergenceRateWarn: 0.001,
  shadowVsEnforcementDivergenceRatePage: 0.005,
};

function clampRate(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Number(value.toFixed(6));
}

function resolveStatus(value: number, warnThreshold: number, pageThreshold: number): AuthorityEnforcementGuardSignalStatus {
  if (value > pageThreshold) return "PAGE";
  if (value > warnThreshold) return "WARN";
  return "OK";
}

function maxStatus(
  left: AuthorityEnforcementGuardSignalStatus,
  right: AuthorityEnforcementGuardSignalStatus
): AuthorityEnforcementGuardSignalStatus {
  const rank = { OK: 0, WARN: 1, PAGE: 2 } as const;
  return rank[left] >= rank[right] ? left : right;
}

function findPolicyVersionUnresolvedCount(report: AuthorityShadowMetricsReport) {
  for (const item of report.series.policyConflictCounts || []) {
    if (item.policyConflictCode === "POLICY_VERSION_UNRESOLVED") {
      return Number(item.count || 0);
    }
  }
  return 0;
}

export function evaluateAuthorityEnforcementGuard(
  report: AuthorityShadowMetricsReport,
  thresholds: Partial<AuthorityEnforcementGuardThresholds> = {}
): AuthorityEnforcementGuardResult {
  const t: AuthorityEnforcementGuardThresholds = {
    ...DEFAULT_AUTHORITY_ENFORCEMENT_GUARD_THRESHOLDS,
    ...thresholds,
  };

  const decisionsTotal = Number(report.summary.decisionsTotal || 0);
  const conflictRate =
    decisionsTotal > 0 ? clampRate(Number(report.summary.policyConflictTotal || 0) / decisionsTotal) : 0;
  const caseOpenRate =
    decisionsTotal > 0 ? clampRate(Number(report.summary.casesOpenedTotal || 0) / decisionsTotal) : 0;
  const deterministicMismatch = Number(report.summary.deterministicMismatchTotal || 0);
  const policyVersionUnresolvedRate =
    decisionsTotal > 0 ? clampRate(findPolicyVersionUnresolvedCount(report) / decisionsTotal) : 0;
  const divergenceRate = clampRate(Number(report.summary.shadowVsEnforcementDivergenceRate || 0));

  const signals: AuthorityEnforcementGuardSignal[] = [
    {
      signalCode: "CONFLICT_RATE",
      value: conflictRate,
      warnThreshold: t.conflictRateWarn,
      pageThreshold: t.conflictRatePage,
      status: resolveStatus(conflictRate, t.conflictRateWarn, t.conflictRatePage),
    },
    {
      signalCode: "CASE_OPEN_RATE",
      value: caseOpenRate,
      warnThreshold: t.caseOpenRateWarn,
      pageThreshold: t.caseOpenRatePage,
      status: resolveStatus(caseOpenRate, t.caseOpenRateWarn, t.caseOpenRatePage),
    },
    {
      signalCode: "DETERMINISTIC_MISMATCH",
      value: deterministicMismatch,
      warnThreshold: 0,
      pageThreshold: 0,
      status: deterministicMismatch > 0 ? "PAGE" : "OK",
    },
    {
      signalCode: "POLICY_VERSION_UNRESOLVED_RATE",
      value: policyVersionUnresolvedRate,
      warnThreshold: t.policyVersionUnresolvedRateWarn,
      pageThreshold: t.policyVersionUnresolvedRatePage,
      status: resolveStatus(
        policyVersionUnresolvedRate,
        t.policyVersionUnresolvedRateWarn,
        t.policyVersionUnresolvedRatePage
      ),
    },
    {
      signalCode: "SHADOW_VS_ENFORCEMENT_DIVERGENCE_RATE",
      value: divergenceRate,
      warnThreshold: t.shadowVsEnforcementDivergenceRateWarn,
      pageThreshold: t.shadowVsEnforcementDivergenceRatePage,
      status: resolveStatus(
        divergenceRate,
        t.shadowVsEnforcementDivergenceRateWarn,
        t.shadowVsEnforcementDivergenceRatePage
      ),
    },
  ].sort((left, right) => left.signalCode.localeCompare(right.signalCode));

  const overallStatus = signals.reduce<AuthorityEnforcementGuardSignalStatus>(
    (status, signal) => maxStatus(status, signal.status),
    "OK"
  );

  const rollbackRecommended = overallStatus === "PAGE";

  return {
    evaluatedAtUtc: new Date().toISOString(),
    windowStartUtc: report.windowStartUtc,
    windowEndUtc: report.windowEndUtc,
    source: report.source,
    reportVersion: report.reportVersion,
    reportHashSha256: report.deterministicHashSha256,
    overallStatus,
    rollbackRecommended,
    killSwitchAction: rollbackRecommended ? "SET_GOV04_AUTH_ENFORCEMENT_KILL_SWITCH_TRUE" : "NONE",
    signals,
  };
}
