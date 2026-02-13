export type AuthorityGuardIndexStatus = "OK" | "WARN" | "PAGE" | null;

export type AuthorityGuardIndexRecord = {
  timestamp: string;
  overallStatus: AuthorityGuardIndexStatus;
  rollbackRecommended: boolean | null;
  guardReportId: string | null;
  reportHash: string | null;
  exitCode: number;
  outputFile: string;
};

export type AuthorityGuardDailySummary = {
  dateUtc: string;
  dateKey: string;
  totalRuns: number;
  statusCounts: Array<{
    status: "OK" | "WARN" | "PAGE" | "UNKNOWN";
    count: number;
  }>;
  rollbackRecommendedCount: number;
  maxExitCode: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  pageRuns: Array<{
    timestamp: string;
    guardReportId: string | null;
    reportHash: string | null;
    exitCode: number;
    outputFile: string;
  }>;
};

function normalizeDateKey(dateUtc: string) {
  const value = String(dateUtc || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("dateUtc must be YYYY-MM-DD");
  }
  return value.replace(/-/g, "");
}

function normalizeTimestamp(value: string) {
  const timestamp = String(value || "").trim();
  if (!/^\d{8}T\d{6}Z$/.test(timestamp)) return null;
  return timestamp;
}

function mapStatus(value: unknown): AuthorityGuardIndexStatus {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "OK") return "OK";
  if (normalized === "WARN") return "WARN";
  if (normalized === "PAGE") return "PAGE";
  return null;
}

export function parseAuthorityGuardIndexLine(line: string): AuthorityGuardIndexRecord | null {
  const raw = String(line || "").trim();
  if (!raw) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const timestamp = normalizeTimestamp(parsed?.timestamp);
  if (!timestamp) return null;

  return {
    timestamp,
    overallStatus: mapStatus(parsed?.overallStatus),
    rollbackRecommended:
      typeof parsed?.rollbackRecommended === "boolean" ? parsed.rollbackRecommended : null,
    guardReportId: String(parsed?.guardReportId || "").trim() || null,
    reportHash: String(parsed?.reportHash || "").trim() || null,
    exitCode: Number.isFinite(Number(parsed?.exitCode)) ? Number(parsed.exitCode) : 1,
    outputFile: String(parsed?.outputFile || "").trim() || "",
  };
}

export function filterAuthorityGuardIndexByDate(
  records: AuthorityGuardIndexRecord[],
  dateUtc: string
): AuthorityGuardIndexRecord[] {
  const dateKey = normalizeDateKey(dateUtc);
  return records
    .filter((record) => record.timestamp.startsWith(dateKey))
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function buildAuthorityGuardDailySummary(
  records: AuthorityGuardIndexRecord[],
  dateUtc: string
): AuthorityGuardDailySummary {
  const dateKey = normalizeDateKey(dateUtc);
  const sorted = [...records].sort((left, right) => left.timestamp.localeCompare(right.timestamp));

  const statusCounts = new Map<string, number>();
  let rollbackRecommendedCount = 0;
  let maxExitCode = 0;

  for (const row of sorted) {
    const status = row.overallStatus || "UNKNOWN";
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    if (row.rollbackRecommended === true) rollbackRecommendedCount += 1;
    if (row.exitCode > maxExitCode) maxExitCode = row.exitCode;
  }

  const orderedStatusKeys: Array<"OK" | "WARN" | "PAGE" | "UNKNOWN"> = ["OK", "WARN", "PAGE", "UNKNOWN"];
  const orderedCounts = orderedStatusKeys.map((status) => ({
    status,
    count: statusCounts.get(status) || 0,
  }));

  const pageRuns = sorted
    .filter((row) => row.overallStatus === "PAGE")
    .map((row) => ({
      timestamp: row.timestamp,
      guardReportId: row.guardReportId,
      reportHash: row.reportHash,
      exitCode: row.exitCode,
      outputFile: row.outputFile,
    }));

  return {
    dateUtc,
    dateKey,
    totalRuns: sorted.length,
    statusCounts: orderedCounts,
    rollbackRecommendedCount,
    maxExitCode,
    firstTimestamp: sorted.length ? sorted[0].timestamp : null,
    lastTimestamp: sorted.length ? sorted[sorted.length - 1].timestamp : null,
    pageRuns,
  };
}

export function renderAuthorityGuardDailyDigestMarkdown(input: {
  summary: AuthorityGuardDailySummary;
  indexPath: string;
}): string {
  const summary = input.summary;
  const lines: string[] = [];
  lines.push("# Authority Guard Daily Telemetry Digest");
  lines.push("");
  lines.push(`- Date (UTC): ${summary.dateUtc}`);
  lines.push(`- Index: ${input.indexPath}`);
  lines.push(`- Total Runs: ${summary.totalRuns}`);
  lines.push(`- Rollback Recommended Count: ${summary.rollbackRecommendedCount}`);
  lines.push(`- Max Exit Code: ${summary.maxExitCode}`);
  lines.push(`- First Timestamp: ${summary.firstTimestamp || "n/a"}`);
  lines.push(`- Last Timestamp: ${summary.lastTimestamp || "n/a"}`);
  lines.push("");
  lines.push("## Status Counts");
  lines.push("");
  lines.push("| Status | Count |");
  lines.push("|---|---:|");
  for (const row of summary.statusCounts) {
    lines.push(`| ${row.status} | ${row.count} |`);
  }
  lines.push("");
  lines.push("## PAGE Runs");
  lines.push("");

  if (!summary.pageRuns.length) {
    lines.push("No PAGE runs recorded for this date.");
  } else {
    lines.push("| Timestamp | Guard Report ID | Report Hash | Exit Code | Output File |");
    lines.push("|---|---|---|---:|---|");
    for (const row of summary.pageRuns) {
      lines.push(
        `| ${row.timestamp} | ${row.guardReportId || "n/a"} | ${row.reportHash || "n/a"} | ${row.exitCode} | ${row.outputFile || "n/a"} |`
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}
