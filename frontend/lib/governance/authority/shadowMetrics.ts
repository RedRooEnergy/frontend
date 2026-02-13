import { canonicalPayloadHash, sha256Hex } from "./hash";
import { listAuthorityShadowDecisionsByWindow, type AuthorityShadowStoreDependencies } from "./shadowStore";
import {
  listAuthorityShadowOverrideCasesByWindow,
  type AuthorityShadowCaseStoreDependencies,
} from "./shadowCaseStore";
import {
  AUTHORITY_SHADOW_EVALUATOR_VERSION,
  type AuthorityShadowConflictCode,
  type AuthorityShadowDecision,
  type AuthorityShadowMetricsReport,
} from "./shadowTypes";

type MetricsSource = "api_internal" | "cli_local" | "cli_http";

export type AuthorityShadowMetricsDependencies = {
  now: () => Date;
  listDecisions: (
    params: {
      fromUtc?: string;
      toUtc?: string;
      limit?: number;
      tenantId?: string;
      policyId?: string;
    },
    dependencyOverrides?: Partial<AuthorityShadowStoreDependencies>
  ) => Promise<any[]>;
  listCases: (
    params: {
      fromUtc?: string;
      toUtc?: string;
      limit?: number;
      tenantId?: string;
      policyId?: string;
      status?: "OPEN" | "ACKNOWLEDGED" | "CLOSED";
    },
    dependencyOverrides?: Partial<AuthorityShadowCaseStoreDependencies>
  ) => Promise<any[]>;
};

const defaultDependencies: AuthorityShadowMetricsDependencies = {
  now: () => new Date(),
  listDecisions: (params, deps) => listAuthorityShadowDecisionsByWindow(params, deps),
  listCases: (params, deps) => listAuthorityShadowOverrideCasesByWindow(params, deps),
};

function resolveDependencies(
  overrides: Partial<AuthorityShadowMetricsDependencies> = {}
): AuthorityShadowMetricsDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function normalizeIsoOrNull(input: unknown) {
  const value = String(input || "").trim();
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function sanitizeInput(input: {
  source?: MetricsSource;
  fromUtc?: string;
  toUtc?: string;
  limit?: number;
  tenantId?: string;
  policyId?: string;
}) {
  const nowUtc = new Date().toISOString();
  const toUtc = normalizeIsoOrNull(input.toUtc) || nowUtc;
  const fromUtc = normalizeIsoOrNull(input.fromUtc) || new Date(Date.parse(toUtc) - 24 * 60 * 60 * 1000).toISOString();
  const limit = Math.min(Math.max(Number(input.limit || 1000), 1), 5000);

  return {
    source: input.source || "api_internal",
    fromUtc,
    toUtc,
    limit,
    tenantId: String(input.tenantId || "").trim() || undefined,
    policyId: String(input.policyId || "").trim() || undefined,
  };
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

function sortCounts<T extends string>(
  map: Map<string, number>,
  mapper: (entry: { key: string; count: number }) => T
): Array<{ [K in T]: string } & { count: number }> {
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => {
      if (left.count !== right.count) return right.count - left.count;
      return left.key.localeCompare(right.key);
    })
    .map((entry) => ({ [mapper(entry)]: entry.key, count: entry.count } as any));
}

export async function runAuthorityShadowMetricsSnapshot(
  input: {
    source?: MetricsSource;
    fromUtc?: string;
    toUtc?: string;
    limit?: number;
    tenantId?: string;
    policyId?: string;
  },
  dependencyOverrides: Partial<AuthorityShadowMetricsDependencies> = {}
): Promise<AuthorityShadowMetricsReport> {
  const deps = resolveDependencies(dependencyOverrides);
  const filters = sanitizeInput(input);

  const decisions = await deps.listDecisions({
    fromUtc: filters.fromUtc,
    toUtc: filters.toUtc,
    limit: filters.limit,
    tenantId: filters.tenantId,
    policyId: filters.policyId,
  });

  const cases = await deps.listCases({
    fromUtc: filters.fromUtc,
    toUtc: filters.toUtc,
    limit: filters.limit,
    tenantId: filters.tenantId,
    policyId: filters.policyId,
  });

  const wouldDecisionCounts = new Map<string, number>();
  const conflictCounts = new Map<string, number>();

  let wouldBlockTotal = 0;
  let policyConflictTotal = 0;
  let deterministicMismatchTotal = 0;

  for (const decision of decisions) {
    const wouldDecision = String(decision.wouldDecision || "WOULD_BLOCK") as AuthorityShadowDecision;
    increment(wouldDecisionCounts, wouldDecision);
    if (decision.wouldBlock) wouldBlockTotal += 1;

    if (decision.policyConflictCode) {
      increment(conflictCounts, String(decision.policyConflictCode) as AuthorityShadowConflictCode);
      policyConflictTotal += 1;
    }

    const canonical = String(decision.canonicalDecisionJson || "");
    const expectedHash = canonical ? sha256Hex(canonical) : "";
    const actualHash = String(decision.decisionHashSha256 || "").trim().toLowerCase();
    if (!canonical || !actualHash || expectedHash !== actualHash) {
      deterministicMismatchTotal += 1;
    }

    if (String(decision.shadowEvaluatorVersion || "") !== AUTHORITY_SHADOW_EVALUATOR_VERSION) {
      deterministicMismatchTotal += 1;
    }
  }

  const casesOpenedTotal = cases.length;
  const openCaseBacklog = cases.filter((entry) => entry.status === "OPEN").length;

  const series = {
    wouldDecisionCounts: sortCounts(wouldDecisionCounts, () => "wouldDecision") as Array<{
      wouldDecision: AuthorityShadowDecision;
      count: number;
    }>,
    policyConflictCounts: sortCounts(conflictCounts, () => "policyConflictCode") as Array<{
      policyConflictCode: AuthorityShadowConflictCode;
      count: number;
    }>,
  };

  const summary = {
    decisionsTotal: decisions.length,
    wouldBlockTotal,
    policyConflictTotal,
    casesOpenedTotal,
    openCaseBacklog,
    deterministicMismatchTotal,
    deterministicMismatchRate:
      decisions.length > 0 ? Number((deterministicMismatchTotal / decisions.length).toFixed(6)) : 0,
  };

  const deterministicHashSha256 = canonicalPayloadHash({
    filters,
    summary,
    series,
  });

  return {
    reportVersion: "gov04-authority-shadow-metrics.v1",
    generatedAtUtc: deps.now().toISOString(),
    windowStartUtc: filters.fromUtc,
    windowEndUtc: filters.toUtc,
    source: filters.source,
    filters: {
      fromUtc: filters.fromUtc,
      toUtc: filters.toUtc,
      limit: filters.limit,
      tenantId: filters.tenantId,
      policyId: filters.policyId,
    },
    summary,
    series,
    deterministicHashSha256,
  };
}
