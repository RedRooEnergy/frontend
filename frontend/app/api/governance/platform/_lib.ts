import fs from "node:fs";
import path from "node:path";

export type TrendStatus = "STABLE" | "REGRESSION" | "IMPROVING";
export type SubsystemOverall = "PASS" | "FAIL" | "NO_DATA";
export type GovernanceRuleStatus = "PASS" | "FAIL";
export type GovernanceRuleSeverity = "CRITICAL";

export type GovernanceCheckResult = {
  id: string;
  status: GovernanceRuleStatus;
  severity: GovernanceRuleSeverity;
  evidence: string[];
  impactSurface: "Communications/Cryptographic";
  notes: string[];
};

export type SubsystemStatus = {
  id: string;
  label: string;
  source: string;
  overall: SubsystemOverall;
  trendStatus: TrendStatus;
  latestRunId: string | null;
  timestampUtc: string | null;
  passCount: number;
  failCount: number;
  notBuiltCount: number;
  notApplicableCount: number;
  notes: string;
};

export type PlatformGovernanceStatus = {
  ok: true;
  generatedAtUtc: string;
  overall: "PASS" | "FAIL";
  trendStatus: TrendStatus;
  summary: {
    totalSubsystems: number;
    passCount: number;
    failCount: number;
    noDataCount: number;
  };
  subsystems: SubsystemStatus[];
  governanceChecks: GovernanceCheckResult[];
  governanceScore: {
    basePercent: number;
    deductions: Array<{
      id: string;
      percent: number;
    }>;
    finalPercent: number;
  };
  pills: {
    cryptographicIntegrity: "GREEN" | "RED";
  };
  badgeState: "PASS" | "NO_DATA" | "REGRESSION" | "IMPROVING" | "DEGRADED";
};

type ScorecardLike = {
  meta?: {
    runId?: string;
    timestampUtc?: string;
  };
  summary?: {
    overall?: string;
    trendStatus?: string;
    passCount?: number;
    failCount?: number;
    notBuiltCount?: number;
    notApplicableCount?: number;
  };
};

function asUpperString(value: unknown) {
  return String(value ?? "").toUpperCase();
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function resolveRepoRoot() {
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(cwd, ".."), path.resolve(cwd, "../.."), path.resolve(cwd, "../../..")];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "artefacts"))) return candidate;
  }
  return cwd;
}

function listFilesNewestFirst(dir: string, matcher: (name: string) => boolean) {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((name) => matcher(name))
    .map((name) => path.join(dir, name));

  const withStats = files
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
  return withStats.map((entry) => entry.filePath);
}

function parseTrendStatus(value: unknown, fallbackOverall: SubsystemOverall): TrendStatus {
  const s = asUpperString(value);
  if (s === "REGRESSION") return "REGRESSION";
  if (s === "IMPROVING") return "IMPROVING";
  if (s === "STABLE") return "STABLE";
  return fallbackOverall === "PASS" ? "STABLE" : "REGRESSION";
}

function parseScorecardFile(filePath: string, base: Omit<SubsystemStatus, "overall" | "trendStatus" | "latestRunId" | "timestampUtc" | "passCount" | "failCount" | "notBuiltCount" | "notApplicableCount" | "notes">): SubsystemStatus {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as ScorecardLike;
    const summary = parsed.summary ?? {};
    const meta = parsed.meta ?? {};

    const failCount = toNumber(summary.failCount);
    const notBuiltCount = toNumber(summary.notBuiltCount);
    const passCount = toNumber(summary.passCount);
    const notApplicableCount = toNumber(summary.notApplicableCount);

    const summaryOverall = asUpperString(summary.overall);
    const overall: SubsystemOverall =
      summaryOverall === "PASS"
        ? "PASS"
        : summaryOverall === "FAIL"
          ? "FAIL"
          : failCount > 0 || notBuiltCount > 0
            ? "FAIL"
            : passCount > 0
              ? "PASS"
              : "NO_DATA";

    return {
      ...base,
      overall,
      trendStatus: parseTrendStatus(summary.trendStatus, overall),
      latestRunId: meta.runId ? String(meta.runId) : null,
      timestampUtc: meta.timestampUtc ? String(meta.timestampUtc) : null,
      passCount,
      failCount,
      notBuiltCount,
      notApplicableCount,
      notes: "",
    };
  } catch {
    return {
      ...base,
      overall: "NO_DATA",
      trendStatus: "REGRESSION",
      latestRunId: null,
      timestampUtc: null,
      passCount: 0,
      failCount: 0,
      notBuiltCount: 0,
      notApplicableCount: 0,
      notes: "Unable to parse scorecard.",
    };
  }
}

function readLatestScorecardStatus(args: {
  root: string;
  id: string;
  label: string;
  source: string;
  dirSegments: string[];
  fileMatcher: (name: string) => boolean;
}) {
  const dir = path.join(args.root, ...args.dirSegments);
  const files = listFilesNewestFirst(dir, args.fileMatcher);
  if (files.length === 0) {
    return {
      id: args.id,
      label: args.label,
      source: args.source,
      overall: "NO_DATA" as const,
      trendStatus: "REGRESSION" as const,
      latestRunId: null,
      timestampUtc: null,
      passCount: 0,
      failCount: 0,
      notBuiltCount: 0,
      notApplicableCount: 0,
      notes: "No scorecard found.",
    };
  }

  return parseScorecardFile(files[0], {
    id: args.id,
    label: args.label,
    source: args.source,
  });
}

function readOrderLifecycleFromMonitoring(root: string): SubsystemStatus {
  const monitorRoot = path.join(root, "artefacts", "governance-monitoring");
  const base = {
    id: "order-lifecycle",
    label: "Order Lifecycle",
    source: "governance-monitoring",
  };

  if (!fs.existsSync(monitorRoot)) {
    return {
      ...base,
      overall: "NO_DATA",
      trendStatus: "REGRESSION",
      latestRunId: null,
      timestampUtc: null,
      passCount: 0,
      failCount: 0,
      notBuiltCount: 0,
      notApplicableCount: 0,
      notes: "Monitoring directory not found.",
    };
  }

  const dateDirs = fs
    .readdirSync(monitorRoot)
    .map((entry) => path.join(monitorRoot, entry))
    .filter((entry) => {
      try {
        return fs.statSync(entry).isDirectory();
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.localeCompare(a));

  for (const dir of dateDirs) {
    const runsPath = path.join(dir, "runs.order-lifecycle.last5.json");
    if (!fs.existsSync(runsPath)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(runsPath, "utf8"));
      if (!Array.isArray(parsed) || parsed.length === 0) continue;

      const latest = parsed.find((entry) => String(entry?.status || "").toLowerCase() === "completed") ?? parsed[0];
      const conclusion = String(latest?.conclusion || "").toLowerCase();
      const overall: SubsystemOverall = conclusion === "success" ? "PASS" : conclusion ? "FAIL" : "NO_DATA";
      return {
        ...base,
        overall,
        trendStatus: overall === "PASS" ? "STABLE" : "REGRESSION",
        latestRunId: latest?.headSha ? String(latest.headSha) : latest?.databaseId ? String(latest.databaseId) : null,
        timestampUtc: latest?.updatedAt ? String(latest.updatedAt) : latest?.createdAt ? String(latest.createdAt) : null,
        passCount: overall === "PASS" ? 1 : 0,
        failCount: overall === "FAIL" ? 1 : 0,
        notBuiltCount: 0,
        notApplicableCount: 0,
        notes: "Derived from monitoring run history.",
      };
    } catch {
      continue;
    }
  }

  return {
    ...base,
    overall: "NO_DATA",
    trendStatus: "REGRESSION",
    latestRunId: null,
    timestampUtc: null,
    passCount: 0,
    failCount: 0,
    notBuiltCount: 0,
    notApplicableCount: 0,
    notes: "No order lifecycle run history found.",
  };
}

function readTextIfExists(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function evaluateExtWeChat07(root: string): GovernanceCheckResult {
  const repoRoot =
    fs.existsSync(path.join(root, "frontend")) && fs.existsSync(path.join(root, "docs"))
      ? root
      : fs.existsSync(path.join(root, "..", "frontend")) && fs.existsSync(path.join(root, "..", "docs"))
        ? path.resolve(root, "..")
        : root;
  const frontendRoot = fs.existsSync(path.join(repoRoot, "frontend", "app"))
    ? path.join(repoRoot, "frontend")
    : fs.existsSync(path.join(repoRoot, "app"))
      ? repoRoot
      : path.join(repoRoot, "frontend");

  const routePath = path.join(frontendRoot, "app", "api", "wechat", "regulator-public-key", "route.ts");
  const helperPath = path.join(frontendRoot, "lib", "wechat", "signaturePublicKey.ts");
  const testPath = path.join(frontendRoot, "tests", "wechat-ui", "runWeChatUiTests.ts");
  const closePackPath = path.join(repoRoot, "docs", "communications", "EXT-WECHAT-07_CLOSE_PACK.md");

  const evidence = [
    "frontend/app/api/wechat/regulator-public-key/route.ts",
    "frontend/lib/wechat/signaturePublicKey.ts",
    "frontend/tests/wechat-ui/runWeChatUiTests.ts",
    "docs/communications/EXT-WECHAT-07_CLOSE_PACK.md",
  ];
  const notes: string[] = [];

  const routeSource = readTextIfExists(routePath);
  const helperSource = readTextIfExists(helperPath);
  const testSource = readTextIfExists(testPath);

  if (!routeSource) notes.push("Route file missing.");
  if (!helperSource) notes.push("Signature helper missing.");
  if (!testSource) notes.push("WeChat UI invariant tests missing.");
  if (!fs.existsSync(closePackPath)) notes.push("Close Pack missing.");

  if (routeSource) {
    const methods = Array.from(routeSource.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)).map(
      (match) => match[1]
    );
    const routeGetOnly = methods.includes("GET") && !methods.some((method) => method !== "GET");
    if (!routeGetOnly) notes.push("Route is not GET-only.");
    if (!routeSource.includes("requireRegulator(")) notes.push("Regulator guard missing.");
    if (!routeSource.includes("runtimeConfig.flags.extensionEnabled")) notes.push("Extension gate missing.");
    if (!routeSource.includes("WECHAT_EXPORT_SIGNATURE_ENABLED")) notes.push("Signature gate missing.");
    if ((routeSource.match(/status:\s*404/g) || []).length < 2) notes.push("Explicit disabled-path 404 guards missing.");
  }

  if (helperSource) {
    if (!helperSource.includes('privateKey.asymmetricKeyType !== "rsa"')) notes.push("RSA-only enforcement missing.");
    if (!helperSource.includes('type: "spki", format: "pem"')) notes.push("SPKI PEM export missing.");
    if (!helperSource.includes('type: "spki", format: "der"')) notes.push("SPKI DER fingerprint input missing.");
  }

  if (testSource && !testSource.includes("REGULATOR-PUBLIC-KEY-GUARDS")) {
    notes.push("REGULATOR-PUBLIC-KEY-GUARDS invariant block missing.");
  }

  return {
    id: "GOV-WECHAT-07",
    status: notes.length === 0 ? "PASS" : "FAIL",
    severity: "CRITICAL",
    evidence,
    impactSurface: "Communications/Cryptographic",
    notes,
  };
}

export function getPlatformGovernanceStatus(): PlatformGovernanceStatus {
  const root = resolveRepoRoot();

  const subsystems: SubsystemStatus[] = [
    readLatestScorecardStatus({
      root,
      id: "buyer-onboarding",
      label: "Buyer Onboarding",
      source: "artefacts/buyer-onboarding-audit",
      dirSegments: ["artefacts", "buyer-onboarding-audit"],
      fileMatcher: (name) => name.startsWith("scorecard.buyer-onboarding.") && name.endsWith(".json"),
    }),
    readLatestScorecardStatus({
      root,
      id: "freight-customs",
      label: "Freight & Customs",
      source: "artefacts/freight-customs-audit",
      dirSegments: ["artefacts", "freight-customs-audit"],
      fileMatcher: (name) => name.startsWith("scorecard.freight-customs.") && name.endsWith(".json"),
    }),
    readLatestScorecardStatus({
      root,
      id: "installer-onboarding",
      label: "Installer Onboarding",
      source: "artefacts/installer-audit",
      dirSegments: ["artefacts", "installer-audit"],
      fileMatcher: (name) => name.startsWith("scorecard.installer-onboarding.") && name.endsWith(".json"),
    }),
    readOrderLifecycleFromMonitoring(root),
    readLatestScorecardStatus({
      root,
      id: "public-participant-sites",
      label: "Public Participant Sites",
      source: "artefacts/public-participant-sites/history",
      dirSegments: ["artefacts", "public-participant-sites", "history"],
      fileMatcher: (name) => name.startsWith("scorecard.") && name.endsWith(".json"),
    }),
  ];
  const governanceChecks: GovernanceCheckResult[] = [evaluateExtWeChat07(root)];

  const summary = subsystems.reduce(
    (acc, subsystem) => {
      acc.totalSubsystems += 1;
      if (subsystem.overall === "PASS") acc.passCount += 1;
      if (subsystem.overall === "FAIL") acc.failCount += 1;
      if (subsystem.overall === "NO_DATA") acc.noDataCount += 1;
      return acc;
    },
    { totalSubsystems: 0, passCount: 0, failCount: 0, noDataCount: 0 }
  );

  const overall: "PASS" | "FAIL" = summary.failCount > 0 || summary.noDataCount > 0 ? "FAIL" : "PASS";
  let trendStatus: TrendStatus = "STABLE";
  if (subsystems.some((subsystem) => subsystem.trendStatus === "REGRESSION") || overall === "FAIL") {
    trendStatus = "REGRESSION";
  } else if (subsystems.some((subsystem) => subsystem.trendStatus === "IMPROVING")) {
    trendStatus = "IMPROVING";
  }

  const ruleWeights: Record<string, number> = {
    "GOV-WECHAT-07": 8,
  };
  const deductions = governanceChecks
    .filter((check) => check.status === "FAIL")
    .map((check) => ({
      id: check.id,
      percent: ruleWeights[check.id] ?? 0,
    }));
  const basePercent = 100;
  const finalPercent = Math.max(
    0,
    basePercent - deductions.reduce((sum, deduction) => sum + deduction.percent, 0)
  );
  const cryptographicIntegrity: "GREEN" | "RED" = governanceChecks.some(
    (check) => check.id === "GOV-WECHAT-07" && check.status === "FAIL"
  )
    ? "RED"
    : "GREEN";

  let badgeState: PlatformGovernanceStatus["badgeState"] = "PASS";
  if (governanceChecks.some((check) => check.id === "GOV-WECHAT-07" && check.status === "FAIL")) {
    badgeState = "DEGRADED";
  } else if (summary.noDataCount > 0) {
    badgeState = "NO_DATA";
  } else if (trendStatus === "REGRESSION") {
    badgeState = "REGRESSION";
  } else if (trendStatus === "IMPROVING") {
    badgeState = "IMPROVING";
  } else if (overall !== "PASS") {
    badgeState = "DEGRADED";
  }

  return {
    ok: true,
    generatedAtUtc: new Date().toISOString(),
    overall,
    trendStatus,
    summary,
    subsystems,
    governanceChecks,
    governanceScore: {
      basePercent,
      deductions,
      finalPercent,
    },
    pills: {
      cryptographicIntegrity,
    },
    badgeState,
  };
}

export function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderGovernanceBadge(label: string, value: string, color: string) {
  const leftWidth = Math.max(128, label.length * 7 + 18);
  const rightWidth = Math.max(64, value.length * 8 + 16);
  const totalWidth = leftWidth + rightWidth;
  const leftTextX = Math.floor(leftWidth / 2);
  const rightTextX = leftWidth + Math.floor(rightWidth / 2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(value)}">
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
    <stop offset=".1" stop-color="#aaa" stop-opacity=".1"/>
    <stop offset=".9" stop-color="#000" stop-opacity=".3"/>
    <stop offset="1" stop-color="#000" stop-opacity=".5"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#555"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">
    <text x="${leftTextX}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${leftTextX}" y="14">${escapeXml(label)}</text>
    <text x="${rightTextX}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
    <text x="${rightTextX}" y="14">${escapeXml(value)}</text>
  </g>
</svg>`;
}
