import {
  appendAuthorityEnforcementGuardReport,
  listAuthorityEnforcementGuardReportsByWindow,
  type AuthorityEnforcementGuardStoreDependencies,
} from "../../../lib/governance/authority/enforcementGuardStore";
import type { AuthorityShadowMetricsReport } from "../../../lib/governance/authority/shadowTypes";
import type { AuthorityEnforcementGuardResult } from "../../../lib/governance/authority/enforcementGuard";
import type { AuthorityEnforcementGuardReportRecord } from "../../../lib/governance/authority/enforcementTypes";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function matchesQuery(record: Record<string, any>, query: Record<string, unknown>) {
  for (const [key, value] of Object.entries(query)) {
    const actual = record[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const range = value as Record<string, unknown>;
      if (typeof range.$gte === "string" && String(actual) < range.$gte) return false;
      if (typeof range.$lte === "string" && String(actual) > range.$lte) return false;
      continue;
    }
    if (actual !== value) return false;
  }
  return true;
}

function createDeps() {
  const rows: AuthorityEnforcementGuardReportRecord[] = [];
  const collection = {
    async createIndex() {
      return;
    },
    async insertOne(doc: any) {
      const duplicate = rows.find(
        (row) => row.guardReportId === doc.guardReportId || row.idempotencyKey === doc.idempotencyKey
      );
      if (duplicate) {
        const err: any = new Error("duplicate key");
        err.code = 11000;
        throw err;
      }
      const inserted = { ...doc, _id: `${rows.length + 1}` };
      rows.push(inserted);
      return { insertedId: inserted._id };
    },
    async findOne(query: Record<string, unknown>) {
      return rows.find((row) => matchesQuery(row as any, query)) || null;
    },
    find(query: Record<string, unknown>) {
      let current = rows.filter((row) => matchesQuery(row as any, query));
      return {
        sort(spec: Record<string, 1 | -1>) {
          const entries = Object.entries(spec);
          current = current.sort((left: any, right: any) => {
            for (const [field, direction] of entries) {
              const l = String(left[field] || "");
              const r = String(right[field] || "");
              if (l === r) continue;
              return direction === -1 ? r.localeCompare(l) : l.localeCompare(r);
            }
            return 0;
          });
          return {
            limit(value: number) {
              current = current.slice(0, value);
              return {
                async toArray() {
                  return current;
                },
              };
            },
          };
        },
      };
    },
  };

  const deps: Partial<AuthorityEnforcementGuardStoreDependencies> = {
    getCollection: async () => collection as any,
    now: () => new Date("2026-02-13T12:00:00.000Z"),
  };

  return { deps };
}

function buildReport(overrides: Partial<AuthorityShadowMetricsReport> = {}): AuthorityShadowMetricsReport {
  return {
    reportVersion: "gov04-authority-shadow-metrics.v1",
    generatedAtUtc: "2026-02-13T12:00:00.000Z",
    windowStartUtc: "2026-02-13T11:45:00.000Z",
    windowEndUtc: "2026-02-13T12:00:00.000Z",
    source: "cli_local",
    filters: {
      fromUtc: "2026-02-13T11:45:00.000Z",
      toUtc: "2026-02-13T12:00:00.000Z",
      limit: 200,
    },
    summary: {
      decisionsTotal: 100,
      wouldBlockTotal: 1,
      policyConflictTotal: 1,
      enforcementDecisionsTotal: 100,
      shadowVsEnforcementDivergenceTotal: 0,
      shadowVsEnforcementDivergenceRate: 0,
      casesOpenedTotal: 1,
      openCaseBacklog: 0,
      deterministicMismatchTotal: 0,
      deterministicMismatchRate: 0,
    },
    series: {
      wouldDecisionCounts: [{ wouldDecision: "WOULD_ALLOW", count: 99 }],
      policyConflictCounts: [{ policyConflictCode: "NO_ACTIVE_POLICY", count: 1 }],
    },
    deterministicHashSha256: "a".repeat(64),
    ...overrides,
  };
}

function buildGuard(overrides: Partial<AuthorityEnforcementGuardResult> = {}): AuthorityEnforcementGuardResult {
  return {
    evaluatedAtUtc: "2026-02-13T12:00:00.000Z",
    windowStartUtc: "2026-02-13T11:45:00.000Z",
    windowEndUtc: "2026-02-13T12:00:00.000Z",
    source: "cli_local",
    reportVersion: "gov04-authority-shadow-metrics.v1",
    reportHashSha256: "a".repeat(64),
    overallStatus: "OK",
    rollbackRecommended: false,
    killSwitchAction: "NONE",
    signals: [
      {
        signalCode: "CONFLICT_RATE",
        value: 0.001,
        warnThreshold: 0.01,
        pageThreshold: 0.03,
        status: "OK",
      },
    ],
    ...overrides,
  };
}

async function testAppendGuardReportIdempotent() {
  const { deps } = createDeps();
  const input = {
    report: buildReport(),
    guard: buildGuard(),
  };

  const first = await appendAuthorityEnforcementGuardReport(input, deps);
  const second = await appendAuthorityEnforcementGuardReport(input, deps);

  assert(first.created === true, "Expected first insert");
  assert(second.created === false, "Expected idempotent dedupe");
  assert(second.record.overallStatus === "OK", "Expected persisted status");
}

async function testListByWindowAndStatus() {
  const { deps } = createDeps();
  await appendAuthorityEnforcementGuardReport(
    {
      report: buildReport(),
      guard: buildGuard(),
    },
    deps
  );
  await appendAuthorityEnforcementGuardReport(
    {
      report: buildReport({
        deterministicHashSha256: "b".repeat(64),
      }),
      guard: buildGuard({
        evaluatedAtUtc: "2026-02-13T12:15:00.000Z",
        reportHashSha256: "b".repeat(64),
        overallStatus: "PAGE",
        rollbackRecommended: true,
        killSwitchAction: "SET_GOV04_AUTH_ENFORCEMENT_KILL_SWITCH_TRUE",
      }),
    },
    deps
  );

  const listed = await listAuthorityEnforcementGuardReportsByWindow(
    {
      fromUtc: "2026-02-13T11:00:00.000Z",
      toUtc: "2026-02-13T13:00:00.000Z",
      overallStatus: "PAGE",
    },
    deps
  );

  assert(listed.length === 1, "Expected one PAGE report");
  assert(listed[0].rollbackRecommended === true, "Expected rollback recommendation persisted");
}

async function run() {
  await testAppendGuardReportIdempotent();
  await testListByWindowAndStatus();
}

run();
