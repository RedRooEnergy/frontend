import fs from "node:fs";
import path from "node:path";

export type TrendStatus = "STABLE" | "REGRESSION" | "IMPROVING";

export type ScorecardLite = {
  meta?: {
    runId?: string;
    timestampUtc?: string;
    baseUrl?: string;
    environment?: string;
  };
  summary?: {
    overall?: "PASS" | "FAIL";
    totalChecks?: number;
    passCount?: number;
    failCount?: number;
    notBuiltCount?: number;
    notApplicableCount?: number;
    trendStatus?: TrendStatus;
  };
};

function safeNumber(input: unknown, fallback = 0) {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

function readJsonFile(filePath: string): ScorecardLite | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as ScorecardLite;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Returns scorecard paths sorted by mtime descending (newest first).
 */
export function listScorecardFilesNewestFirst(historyDir: string): string[] {
  if (!fs.existsSync(historyDir)) return [];

  const entries = fs
    .readdirSync(historyDir)
    .filter((name) => name.startsWith("scorecard.") && name.endsWith(".json"))
    .map((name) => path.join(historyDir, name));

  const withStats = entries
    .map((filePath) => {
      try {
        const stat = fs.statSync(filePath);
        return { filePath, mtimeMs: stat.mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ filePath: string; mtimeMs: number }>;

  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);

  return withStats.map((item) => item.filePath);
}

/**
 * Loads last N scorecards from history dir, newest-first.
 */
export function loadRecentScorecards(historyDir: string, limit = 5): ScorecardLite[] {
  const files = listScorecardFilesNewestFirst(historyDir).slice(0, Math.max(1, limit));
  const scorecards: ScorecardLite[] = [];
  for (const file of files) {
    const parsed = readJsonFile(file);
    if (parsed) scorecards.push(parsed);
  }
  return scorecards;
}

export function analyzeTrend(params: {
  current: ScorecardLite;
  previous: ScorecardLite[]; // newest-first (does not include current)
  windowSize?: number; // default 5
}): { trendStatus: TrendStatus; reasons: string[] } {
  const windowSize = Math.max(2, params.windowSize ?? 5);
  const previous = params.previous.slice(0, windowSize - 1); // keep N-1 prev
  const reasons: string[] = [];

  // If we have no prior runs, trend is stable.
  if (previous.length === 0) {
    return { trendStatus: "STABLE", reasons: ["No prior runs available."] };
  }

  const currentPass = safeNumber(params.current.summary?.passCount);
  const currentFail = safeNumber(params.current.summary?.failCount);
  const prevPass = safeNumber(previous[0].summary?.passCount);
  const prevFail = safeNumber(previous[0].summary?.failCount);

  // Rule 1: regression if current failCount > previous failCount
  if (currentFail > prevFail) {
    reasons.push(`failCount increased: ${prevFail} -> ${currentFail}`);
    return { trendStatus: "REGRESSION", reasons };
  }

  // Rule 2: regression if 2 of last 5 degraded passCount (pairwise comparisons)
  // Build window newest-first: [current, ...previous]
  const window: ScorecardLite[] = [params.current, ...previous].slice(0, windowSize);

  let degradedComparisons = 0;
  for (let i = 0; i < window.length - 1; i += 1) {
    const a = safeNumber(window[i].summary?.passCount);
    const b = safeNumber(window[i + 1].summary?.passCount);
    // Degradation if newer run has LOWER passCount than the immediately older run
    if (a < b) degradedComparisons += 1;
  }

  if (degradedComparisons >= 2) {
    reasons.push(`passCount degraded in ${degradedComparisons} comparisons within last ${window.length} runs`);
    return { trendStatus: "REGRESSION", reasons };
  }

  // Improving heuristic (non-regression): improving if failCount decreases OR passCount increases vs previous run.
  const improving = currentFail < prevFail || currentPass > prevPass;
  if (improving) {
    reasons.push(`improving vs previous: pass ${prevPass} -> ${currentPass}, fail ${prevFail} -> ${currentFail}`);
    return { trendStatus: "IMPROVING", reasons };
  }

  return { trendStatus: "STABLE", reasons: ["No regression signals detected."] };
}
