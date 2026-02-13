import {
  buildAuthorityGuardDailySummary,
  filterAuthorityGuardIndexByDate,
  parseAuthorityGuardIndexLine,
  renderAuthorityGuardDailyDigestMarkdown,
} from "../../../lib/governance/authority/guardDigest";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function testParseAndFilter() {
  const lines = [
    JSON.stringify({
      timestamp: "20260214T010000Z",
      overallStatus: "OK",
      rollbackRecommended: false,
      guardReportId: "guard-1",
      reportHash: "a".repeat(64),
      exitCode: 0,
      outputFile: "a.json",
    }),
    JSON.stringify({
      timestamp: "20260214T020000Z",
      overallStatus: "PAGE",
      rollbackRecommended: true,
      guardReportId: "guard-2",
      reportHash: "b".repeat(64),
      exitCode: 2,
      outputFile: "b.json",
    }),
    JSON.stringify({
      timestamp: "20260213T230000Z",
      overallStatus: "WARN",
      rollbackRecommended: false,
      guardReportId: "guard-0",
      reportHash: "c".repeat(64),
      exitCode: 0,
      outputFile: "c.json",
    }),
  ];

  const records = lines.map(parseAuthorityGuardIndexLine).filter((entry) => Boolean(entry));
  assert(records.length === 3, "Expected three parsed records");

  const filtered = filterAuthorityGuardIndexByDate(records as any, "2026-02-14");
  assert(filtered.length === 2, "Expected two records for date");
  assert(filtered[0].timestamp === "20260214T010000Z", "Expected timestamp sorting");
}

async function testSummaryAndMarkdownDeterminism() {
  const records = [
    parseAuthorityGuardIndexLine(
      JSON.stringify({
        timestamp: "20260214T010000Z",
        overallStatus: "OK",
        rollbackRecommended: false,
        guardReportId: "guard-1",
        reportHash: "a".repeat(64),
        exitCode: 0,
        outputFile: "a.json",
      })
    )!,
    parseAuthorityGuardIndexLine(
      JSON.stringify({
        timestamp: "20260214T020000Z",
        overallStatus: "PAGE",
        rollbackRecommended: true,
        guardReportId: "guard-2",
        reportHash: "b".repeat(64),
        exitCode: 2,
        outputFile: "b.json",
      })
    )!,
  ];

  const summary = buildAuthorityGuardDailySummary(records, "2026-02-14");
  assert(summary.totalRuns === 2, "Expected total runs");
  assert(summary.rollbackRecommendedCount === 1, "Expected rollback count");
  assert(summary.maxExitCode === 2, "Expected max exit code");
  assert(summary.pageRuns.length === 1, "Expected page run count");

  const markdownA = renderAuthorityGuardDailyDigestMarkdown({
    summary,
    indexPath: "/tmp/index.jsonl",
  });
  const markdownB = renderAuthorityGuardDailyDigestMarkdown({
    summary,
    indexPath: "/tmp/index.jsonl",
  });
  assert(markdownA === markdownB, "Expected deterministic markdown output");
  assert(markdownA.includes("Authority Guard Daily Telemetry Digest"), "Expected digest header");
}

async function run() {
  await testParseAndFilter();
  await testSummaryAndMarkdownDeterminism();
}

run();
