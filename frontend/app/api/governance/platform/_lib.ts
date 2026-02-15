import crypto from "node:crypto";
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
  impactSurface:
    | "Communications/Cryptographic"
    | "Platform/IntegrityChain"
    | "Platform/CommunicationIntegrity"
    | "Platform/DesignAuthorityActivation";
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

function sha256FileIfExists(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const bytes = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(bytes).digest("hex");
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

function evaluateChainIntegrity01(root: string): GovernanceCheckResult {
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

  const evidence = [
    "docs/communications/EXT-CHAIN-INTEGRITY-01_ASSERTION.md",
    "docs/communications/EXT-CHAIN-INTEGRITY-01_SCHEMA_DESIGN_PACK.md",
    "docs/communications/EXT-CHAIN-INTEGRITY-01_INVARIANT_TEST_SCAFFOLDING_SPEC.md",
    "docs/communications/EXT-CHAIN-INTEGRITY-01_CLOSE_PACK.md",
    "docs/communications/EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_AUTHORIZATION_PACKET.md",
    "docs/governance/BOARD_RESOLUTION_EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_AUTHORIZATION_v1.0.md",
    "frontend/lib/chainIntegrity/canonicalSettlement.ts",
    "frontend/lib/chainIntegrity/chainComputation.ts",
    "frontend/lib/chainIntegrity/verifyIntegrityChain.ts",
    "frontend/lib/chainIntegrity/writeOnceGuards.ts",
    "frontend/lib/chainIntegrity/exportManifestStore.ts",
    "frontend/lib/chainIntegrity/freightSettlementStore.ts",
    "frontend/tests/chain-integrity/runChainIntegrityPhase1Tests.ts",
    "frontend/tests/chain-integrity/runChainIntegrityPhase2Tests.ts",
  ];
  const notes: string[] = [];

  const requiredDocs = [
    path.join(repoRoot, "docs", "communications", "EXT-CHAIN-INTEGRITY-01_ASSERTION.md"),
    path.join(repoRoot, "docs", "communications", "EXT-CHAIN-INTEGRITY-01_SCHEMA_DESIGN_PACK.md"),
    path.join(repoRoot, "docs", "communications", "EXT-CHAIN-INTEGRITY-01_INVARIANT_TEST_SCAFFOLDING_SPEC.md"),
    path.join(repoRoot, "docs", "communications", "EXT-CHAIN-INTEGRITY-01_CLOSE_PACK.md"),
    path.join(repoRoot, "docs", "communications", "EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_AUTHORIZATION_PACKET.md"),
    path.join(repoRoot, "docs", "governance", "BOARD_RESOLUTION_EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_AUTHORIZATION_v1.0.md"),
  ];
  for (const filePath of requiredDocs) {
    if (!fs.existsSync(filePath)) {
      notes.push(`Required artefact missing: ${path.relative(repoRoot, filePath)}`);
    }
  }

  const canonicalPath = path.join(frontendRoot, "lib", "chainIntegrity", "canonicalSettlement.ts");
  const chainPath = path.join(frontendRoot, "lib", "chainIntegrity", "chainComputation.ts");
  const verifyPath = path.join(frontendRoot, "lib", "chainIntegrity", "verifyIntegrityChain.ts");
  const guardsPath = path.join(frontendRoot, "lib", "chainIntegrity", "writeOnceGuards.ts");
  const manifestStorePath = path.join(frontendRoot, "lib", "chainIntegrity", "exportManifestStore.ts");
  const settlementStorePath = path.join(frontendRoot, "lib", "chainIntegrity", "freightSettlementStore.ts");
  const phase1TestPath = path.join(frontendRoot, "tests", "chain-integrity", "runChainIntegrityPhase1Tests.ts");
  const phase2TestPath = path.join(frontendRoot, "tests", "chain-integrity", "runChainIntegrityPhase2Tests.ts");

  const requiredImplFiles = [
    canonicalPath,
    chainPath,
    verifyPath,
    guardsPath,
    manifestStorePath,
    settlementStorePath,
    phase1TestPath,
    phase2TestPath,
  ];
  for (const filePath of requiredImplFiles) {
    if (!fs.existsSync(filePath)) {
      notes.push(`Required implementation file missing: ${path.relative(repoRoot, filePath)}`);
    }
  }

  const canonicalSource = readTextIfExists(canonicalPath);
  const chainSource = readTextIfExists(chainPath);
  const verifySource = readTextIfExists(verifyPath);
  const guardSource = readTextIfExists(guardsPath);
  const manifestStoreSource = readTextIfExists(manifestStorePath);
  const settlementStoreSource = readTextIfExists(settlementStorePath);

  if (canonicalSource && !canonicalSource.includes("FREIGHT_SETTLEMENT_CANONICAL_V1")) {
    notes.push("canonicalSettlement.ts missing schema-version guard.");
  }
  if (chainSource) {
    if (!chainSource.includes("computeChainRoot")) notes.push("chainComputation.ts missing computeChainRoot.");
    if (!chainSource.includes('createHash("sha256")')) notes.push("chainComputation.ts missing SHA-256 computation.");
  }
  if (guardSource) {
    if (!guardSource.includes("assertWriteOnceTransition")) notes.push("writeOnceGuards.ts missing assertWriteOnceTransition.");
    if (!guardSource.includes("assertFinalOnlyCanonicalPayload")) notes.push("writeOnceGuards.ts missing FINAL-only canonical guard.");
  }
  if (manifestStoreSource && !manifestStoreSource.includes("EXPORT_MANIFEST_WRITE_ONCE_FIELDS")) {
    notes.push("exportManifestStore.ts missing protected write-once field list.");
  }
  if (settlementStoreSource && !settlementStoreSource.includes("FREIGHT_SETTLEMENT_WRITE_ONCE_FIELDS")) {
    notes.push("freightSettlementStore.ts missing protected write-once field list.");
  }
  if (verifySource) {
    const requiredFailureClasses = [
      "SNAPSHOT_MISMATCH",
      "MANIFEST_MISMATCH",
      "SETTLEMENT_MISMATCH",
      "CHAIN_ROOT_INVALID",
      "MISSING_REFERENCE",
    ];
    for (const failureClass of requiredFailureClasses) {
      if (!verifySource.includes(`"${failureClass}"`)) {
        notes.push(`verifyIntegrityChain.ts missing failure class: ${failureClass}`);
      }
    }
    if (!verifySource.includes("computeChainRoot")) {
      notes.push("verifyIntegrityChain.ts missing chain root recomputation.");
    }
  }

  return {
    id: "GOV-CHAIN-01",
    status: notes.length === 0 ? "PASS" : "FAIL",
    severity: "CRITICAL",
    evidence,
    impactSurface: "Platform/IntegrityChain",
    notes,
  };
}

function evaluateChatGovernance01(root: string): GovernanceCheckResult {
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

  const ruleContractPath = path.join(repoRoot, "docs", "governance", "GOV-CHAT-01_PGA_RULE_CONTRACT.md");
  const statusRoutePath = path.join(frontendRoot, "app", "api", "governance", "chatbot", "status", "route.ts");
  const badgeRoutePath = path.join(frontendRoot, "app", "api", "governance", "chatbot", "badge", "route.ts");
  const workflowPath = path.join(repoRoot, ".github", "workflows", "chatbot-audit.yml");
  const scorecardPath = path.join(repoRoot, "scorecards", "chatbot.scorecard.json");

  const evidence = [
    "docs/governance/GOV-CHAT-01_PGA_RULE_CONTRACT.md",
    "frontend/app/api/governance/chatbot/status/route.ts",
    "frontend/app/api/governance/chatbot/badge/route.ts",
    ".github/workflows/chatbot-audit.yml",
    "scorecards/chatbot.scorecard.json",
  ];

  const notes: string[] = [];
  const addNote = (code: string, detail?: string) => notes.push(detail ? `${code}:${detail}` : code);

  if (!fs.existsSync(ruleContractPath)) {
    addNote("CHAT_RULE_CONTRACT_MISSING");
  }

  const statusRouteSource = readTextIfExists(statusRoutePath);
  const badgeRouteSource = readTextIfExists(badgeRoutePath);
  const workflowSource = readTextIfExists(workflowPath);

  if (!statusRouteSource) {
    addNote("CHAT_STATUS_ROUTE_MISSING");
  } else {
    if (!statusRouteSource.includes("scorecards/chatbot.scorecard.json")) {
      addNote("CHAT_STATUS_ROUTE_INPUT_PATH_INVALID");
    }
    if (!statusRouteSource.includes("extensionId")) {
      addNote("CHAT_STATUS_ROUTE_PAYLOAD_INVALID");
    }
    if (!statusRouteSource.includes("overall")) {
      addNote("CHAT_STATUS_ROUTE_PAYLOAD_INVALID");
    }
  }

  if (!badgeRouteSource) {
    addNote("CHAT_BADGE_ROUTE_MISSING");
  } else {
    if (!badgeRouteSource.includes("scorecards/chatbot.scorecard.json")) {
      addNote("CHAT_BADGE_ROUTE_INPUT_PATH_INVALID");
    }
    if (!badgeRouteSource.includes("renderBadge(\"chatbot-audit\", overall, color)")) {
      addNote("CHAT_BADGE_STATUS_MISMATCH");
    }
    if (!badgeRouteSource.includes('overall === "PASS"')) {
      addNote("CHAT_BADGE_STATUS_MISMATCH");
    }
    if (!badgeRouteSource.includes('overall === "NO_DATA"')) {
      addNote("CHAT_BADGE_STATUS_MISMATCH");
    }
  }

  if (!workflowSource) {
    addNote("CHAT_CI_GATE_MISSING");
  } else {
    if (!workflowSource.includes("npm run test:chatbot")) {
      addNote("CHAT_CI_TEST_RUN_MISSING");
    }
    if (!workflowSource.includes("chatbot.scorecard.json")) {
      addNote("CHAT_CI_SCORECARD_ASSERT_MISSING");
    }
    if (!workflowSource.includes("Chatbot scorecard is not PASS")) {
      addNote("CHAT_CI_BYPASS_DETECTED");
    }
  }

  if (!fs.existsSync(scorecardPath)) {
    addNote("CHAT_SCORECARD_MISSING");
  } else {
    try {
      const parsed = JSON.parse(fs.readFileSync(scorecardPath, "utf8")) as {
        overall?: string;
        failCount?: number;
        checks?: Array<{ id?: string; status?: string }>;
      };

      const overall = String(parsed.overall || "").toUpperCase();
      if (overall !== "PASS") {
        addNote("CHAT_SCORECARD_OVERALL_NOT_PASS", overall || "UNKNOWN");
      }

      const failCount = Number(parsed.failCount || 0);
      if (!Number.isFinite(failCount) || failCount > 0) {
        addNote("CHAT_SCORECARD_FAILCOUNT_NONZERO", String(parsed.failCount ?? "UNKNOWN"));
      }

      const checks = Array.isArray(parsed.checks) ? parsed.checks : [];
      const failingChecks = checks.filter((row) => String(row?.status || "").toUpperCase() !== "PASS");
      if (failingChecks.length > 0) {
        addNote(
          "CHAT_SCORECARD_CHECK_NONPASS",
          failingChecks.map((row) => String(row.id || "UNKNOWN")).join(",")
        );
      }
    } catch {
      addNote("CHAT_SCORECARD_PARSE_INVALID");
    }
  }

  return {
    id: "GOV-CHAT-01",
    status: notes.length === 0 ? "PASS" : "FAIL",
    severity: "CRITICAL",
    evidence,
    impactSurface: "Platform/CommunicationIntegrity",
    notes,
  };
}

function evaluateGovAuth02Activation(root: string): GovernanceCheckResult {
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

  const activationSpecPath = path.join(
    repoRoot,
    "docs",
    "extensions",
    "EXT-GOV-AUTH-02-ACTIVATION",
    "EXT-GOV-AUTH-02-ACTIVATION_AUTHORIZATION_SPEC_v1.0.md"
  );
  const staticContractPath = path.join(
    repoRoot,
    "docs",
    "governance",
    "GOV-AUTH-02-ACTIVATION_STATIC_RULE_CI_CONTRACT_v1.0.md"
  );
  const multisigContractPath = path.join(
    repoRoot,
    "docs",
    "governance",
    "GOV-AUTH-02_MULTISIGNATURE_WORKFLOW_CONTRACT_v1.0.md"
  );
  const rollbackControlsPath = path.join(
    repoRoot,
    "docs",
    "governance",
    "EXT-GOV-AUTH-02-ACTIVATION_ROLLOUT_ROLLBACK_CONTROLS_v1.0.md"
  );
  const rollbackRehearsalTemplatePath = path.join(
    repoRoot,
    "docs",
    "governance",
    "EXT-GOV-AUTH-02-ACTIVATION_ROLLBACK_REHEARSAL_RECORD_TEMPLATE_v1.0.md"
  );
  const closePackPath = path.join(repoRoot, "docs", "governance", "EXT-GOV-AUTH-02-ACTIVATION_CLOSE_PACK_v1.0.md");
  const manifestPath = path.join(repoRoot, "docs", "governance", "EXT-GOV-AUTH-02-ACTIVATION_MANIFEST_v1.0.json");
  const implementationAuthorizationPath = path.join(
    repoRoot,
    "docs",
    "governance",
    "BOARD_RESOLUTION_EXT-GOV-AUTH-02-ACTIVATION_IMPLEMENTATION_AUTHORIZATION_v1.0.md"
  );

  const configPath = path.join(frontendRoot, "lib", "governance", "authority", "multisig", "config.ts");
  const hashPath = path.join(frontendRoot, "lib", "governance", "authority", "multisig", "hash.ts");
  const ledgerStorePath = path.join(frontendRoot, "lib", "governance", "authority", "multisig", "ledgerStore.ts");
  const servicePath = path.join(frontendRoot, "lib", "governance", "authority", "multisig", "service.ts");
  const testPath = path.join(
    frontendRoot,
    "tests",
    "governance",
    "authority",
    "runGovAuth02ActivationBuildOnlyTests.ts"
  );
  const workflowPath = path.join(repoRoot, ".github", "workflows", "governance-platform-aggregator.yml");

  const evidence = [
    "docs/extensions/EXT-GOV-AUTH-02-ACTIVATION/EXT-GOV-AUTH-02-ACTIVATION_AUTHORIZATION_SPEC_v1.0.md",
    "docs/governance/GOV-AUTH-02-ACTIVATION_STATIC_RULE_CI_CONTRACT_v1.0.md",
    "docs/governance/GOV-AUTH-02_MULTISIGNATURE_WORKFLOW_CONTRACT_v1.0.md",
    "docs/governance/EXT-GOV-AUTH-02-ACTIVATION_ROLLOUT_ROLLBACK_CONTROLS_v1.0.md",
    "docs/governance/EXT-GOV-AUTH-02-ACTIVATION_ROLLBACK_REHEARSAL_RECORD_TEMPLATE_v1.0.md",
    "docs/governance/EXT-GOV-AUTH-02-ACTIVATION_CLOSE_PACK_v1.0.md",
    "docs/governance/EXT-GOV-AUTH-02-ACTIVATION_MANIFEST_v1.0.json",
    "docs/governance/BOARD_RESOLUTION_EXT-GOV-AUTH-02-ACTIVATION_IMPLEMENTATION_AUTHORIZATION_v1.0.md",
    "frontend/lib/governance/authority/multisig/config.ts",
    "frontend/lib/governance/authority/multisig/hash.ts",
    "frontend/lib/governance/authority/multisig/ledgerStore.ts",
    "frontend/lib/governance/authority/multisig/service.ts",
    "frontend/tests/governance/authority/runGovAuth02ActivationBuildOnlyTests.ts",
    ".github/workflows/governance-platform-aggregator.yml",
  ];

  const notes: string[] = [];
  const addNote = (code: string, detail?: string) => notes.push(detail ? `${code}:${detail}` : code);

  const requiredPaths = [
    activationSpecPath,
    staticContractPath,
    multisigContractPath,
    rollbackControlsPath,
    rollbackRehearsalTemplatePath,
    closePackPath,
    manifestPath,
    implementationAuthorizationPath,
    configPath,
    hashPath,
    ledgerStorePath,
    servicePath,
    testPath,
    workflowPath,
  ];

  for (const requiredPath of requiredPaths) {
    if (!fs.existsSync(requiredPath)) {
      addNote("AUTH02_ACTIVATION_REQUIRED_ARTIFACT_MISSING", path.relative(repoRoot, requiredPath));
    }
  }

  const activationSpecSource = readTextIfExists(activationSpecPath);
  const staticContractSource = readTextIfExists(staticContractPath);
  const rollbackControlsSource = readTextIfExists(rollbackControlsPath);
  const rollbackRehearsalTemplateSource = readTextIfExists(rollbackRehearsalTemplatePath);
  const closePackSource = readTextIfExists(closePackPath);
  const implementationAuthorizationSource = readTextIfExists(implementationAuthorizationPath);
  const configSource = readTextIfExists(configPath);
  const serviceSource = readTextIfExists(servicePath);
  const workflowSource = readTextIfExists(workflowPath);

  if (activationSpecSource) {
    if (!activationSpecSource.includes("Runtime Authorization: NOT GRANTED")) {
      addNote("AUTH02_ACTIVATION_NON_AUTH_CLAUSE_MISSING");
    }
    if (!activationSpecSource.includes("Out of scope:")) {
      addNote("AUTH02_ACTIVATION_SCOPE_BOUNDARY_MISSING");
    }
  }

  if (staticContractSource) {
    if (!staticContractSource.includes("Rule ID: `GOV-AUTH-02-ACTIVATION`")) {
      addNote("AUTH02_ACTIVATION_RULE_ID_DECLARATION_MISSING");
    }
    if (!staticContractSource.includes("Mode: Binary PASS/FAIL")) {
      addNote("AUTH02_ACTIVATION_BINARY_SCORING_DECLARATION_MISSING");
    }
    if (!staticContractSource.includes("Severity: CRITICAL")) {
      addNote("AUTH02_ACTIVATION_CRITICAL_SEVERITY_DECLARATION_MISSING");
    }
    if (!staticContractSource.includes("CI bypass language present.")) {
      addNote("AUTH02_ACTIVATION_CI_BYPASS_DRIFT_CHECK_MISSING");
    }
  }

  if (rollbackControlsSource) {
    if (!rollbackControlsSource.includes("Rollback is mandatory on:")) {
      addNote("AUTH02_ACTIVATION_ROLLBACK_TRIGGER_DECLARATION_MISSING");
    }
    if (!rollbackControlsSource.includes("ledger immutability breach")) {
      addNote("AUTH02_ACTIVATION_LEDGER_IMMUTABILITY_ROLLBACK_MISSING");
    }
    if (!rollbackControlsSource.includes("No rollback step may delete immutable evidence.")) {
      addNote("AUTH02_ACTIVATION_EVIDENCE_PRESERVATION_CLAUSE_MISSING");
    }
  }

  if (rollbackRehearsalTemplateSource) {
    if (!rollbackRehearsalTemplateSource.includes("Rehearsal Metadata")) {
      addNote("AUTH02_ACTIVATION_ROLLBACK_REHEARSAL_TEMPLATE_SECTION_MISSING");
    }
    if (!rollbackRehearsalTemplateSource.includes("Deterministic Rollback Sequence Evidence")) {
      addNote("AUTH02_ACTIVATION_ROLLBACK_REHEARSAL_SEQUENCE_SECTION_MISSING");
    }
    if (!rollbackRehearsalTemplateSource.includes("No runtime activation or authority expansion was introduced.")) {
      addNote("AUTH02_ACTIVATION_ROLLBACK_REHEARSAL_NON_EXPANSION_ATTESTATION_MISSING");
    }
  }

  if (closePackSource) {
    const requiredClosePackReferences = [
      "EXT-GOV-AUTH-02-ACTIVATION_AUTHORIZATION_SPEC_v1.0.md",
      "GOV-AUTH-02-ACTIVATION_STATIC_RULE_CI_CONTRACT_v1.0.md",
      "EXT-GOV-AUTH-02-ACTIVATION_ROLLOUT_ROLLBACK_CONTROLS_v1.0.md",
      "EXT-GOV-AUTH-02-ACTIVATION_CLOSE_PACK_v1.0.md",
    ];
    for (const reference of requiredClosePackReferences) {
      if (!closePackSource.includes(reference)) {
        addNote("AUTH02_ACTIVATION_CLOSE_PACK_REFERENCE_MISSING", reference);
      }
    }
    if (!closePackSource.includes("Runtime authorization remains NOT GRANTED")) {
      addNote("AUTH02_ACTIVATION_CLOSE_PACK_NON_AUTH_DECLARATION_MISSING");
    }
  }

  if (implementationAuthorizationSource) {
    if (!implementationAuthorizationSource.includes("build-phase development only")) {
      addNote("AUTH02_ACTIVATION_IMPLEMENTATION_SCOPE_NOT_BOUNDED");
    }
    if (!implementationAuthorizationSource.includes("Runtime activation remains deferred and not authorized.")) {
      addNote("AUTH02_ACTIVATION_IMPLEMENTATION_NON_AUTH_DECLARATION_MISSING");
    }
  }

  if (configSource) {
    if (!configSource.includes("ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD")) {
      addNote("AUTH02_ACTIVATION_BUILD_FLAG_GUARD_MISSING");
    }
    if (!configSource.includes("GOV_AUTH02_RUNTIME_ACTIVATION_NOT_AUTHORIZED")) {
      addNote("AUTH02_ACTIVATION_RUNTIME_FORBIDDEN_GUARD_MISSING");
    }
  }

  if (serviceSource) {
    if (!serviceSource.includes("assertGovAuth02ActivationBuildEnabled")) {
      addNote("AUTH02_ACTIVATION_BUILD_ASSERTION_MISSING");
    }
    if (!serviceSource.includes("writeAdminAudit")) {
      addNote("AUTH02_ACTIVATION_AUDIT_COUPLING_MISSING");
    }
    if (!serviceSource.includes("triggerAuthorityMultisigRuntimeActivation")) {
      addNote("AUTH02_ACTIVATION_RUNTIME_TRIGGER_GUARD_MISSING");
    }
  }

  if (workflowSource) {
    if (!workflowSource.includes("Assert GOV-AUTH-02-ACTIVATION PASS")) {
      addNote("AUTH02_ACTIVATION_PGA_CI_ASSERTION_MISSING");
    }
    if (!workflowSource.includes("GOV-AUTH-02-ACTIVATION")) {
      addNote("AUTH02_ACTIVATION_PGA_CI_RULE_ID_MISSING");
    }
  }

  const manifestSource = readTextIfExists(manifestPath);
  if (!manifestSource) {
    addNote("AUTH02_ACTIVATION_MANIFEST_MISSING");
  } else {
    try {
      const manifest = JSON.parse(manifestSource) as {
        extensionId?: string;
        runtimeAuthorization?: string;
        documents?: Array<{ path?: string; sha256?: string }>;
        authorityAnchors?: Array<{ extensionId?: string; manifestPath?: string; manifestSha256?: string }>;
      };

      if (manifest.extensionId !== "EXT-GOV-AUTH-02-ACTIVATION") {
        addNote("AUTH02_ACTIVATION_MANIFEST_EXTENSION_ID_INVALID");
      }
      if (String(manifest.runtimeAuthorization || "").toUpperCase() !== "NOT GRANTED") {
        addNote("AUTH02_ACTIVATION_MANIFEST_RUNTIME_AUTH_STATE_INVALID");
      }

      const documents = Array.isArray(manifest.documents) ? manifest.documents : [];
      if (documents.length === 0) {
        addNote("AUTH02_ACTIVATION_MANIFEST_DOCUMENTS_EMPTY");
      } else {
        const requiredManifestPaths = [
          "docs/extensions/EXT-GOV-AUTH-02-ACTIVATION/EXT-GOV-AUTH-02-ACTIVATION_AUTHORIZATION_SPEC_v1.0.md",
          "docs/governance/GOV-AUTH-02-ACTIVATION_STATIC_RULE_CI_CONTRACT_v1.0.md",
          "docs/governance/EXT-GOV-AUTH-02-ACTIVATION_ROLLOUT_ROLLBACK_CONTROLS_v1.0.md",
          "docs/governance/EXT-GOV-AUTH-02-ACTIVATION_CLOSE_PACK_v1.0.md",
        ];

        for (const requiredManifestPath of requiredManifestPaths) {
          const entry = documents.find((doc) => doc.path === requiredManifestPath);
          if (!entry) {
            addNote("AUTH02_ACTIVATION_MANIFEST_REQUIRED_PATH_MISSING", requiredManifestPath);
            continue;
          }

          const expectedSha = String(entry.sha256 || "").trim().toLowerCase();
          if (!/^[0-9a-f]{64}$/.test(expectedSha)) {
            addNote("AUTH02_ACTIVATION_MANIFEST_ENTRY_INVALID", requiredManifestPath);
            continue;
          }

          const absolutePath = path.join(repoRoot, requiredManifestPath);
          const actualSha = sha256FileIfExists(absolutePath);
          if (!actualSha) {
            addNote("AUTH02_ACTIVATION_MANIFEST_FILE_MISSING", requiredManifestPath);
            continue;
          }
          if (actualSha !== expectedSha) {
            addNote("AUTH02_ACTIVATION_MANIFEST_HASH_MISMATCH", requiredManifestPath);
          }
        }
      }

      const authorityAnchors = Array.isArray(manifest.authorityAnchors) ? manifest.authorityAnchors : [];
      for (const anchor of authorityAnchors) {
        const manifestAnchorPath = String(anchor.manifestPath || "").trim();
        const expectedAnchorSha = String(anchor.manifestSha256 || "").trim().toLowerCase();
        if (!manifestAnchorPath || !/^[0-9a-f]{64}$/.test(expectedAnchorSha)) {
          addNote("AUTH02_ACTIVATION_AUTHORITY_ANCHOR_INVALID", String(anchor.extensionId || "UNKNOWN"));
          continue;
        }
        const resolvedAnchorPath = path.join(repoRoot, manifestAnchorPath);
        const actualAnchorSha = sha256FileIfExists(resolvedAnchorPath);
        if (!actualAnchorSha) {
          addNote("AUTH02_ACTIVATION_AUTHORITY_ANCHOR_FILE_MISSING", manifestAnchorPath);
          continue;
        }
        if (actualAnchorSha !== expectedAnchorSha) {
          addNote("AUTH02_ACTIVATION_AUTHORITY_ANCHOR_HASH_MISMATCH", manifestAnchorPath);
        }
      }
    } catch {
      addNote("AUTH02_ACTIVATION_MANIFEST_PARSE_INVALID");
    }
  }

  return {
    id: "GOV-AUTH-02-ACTIVATION",
    status: notes.length === 0 ? "PASS" : "FAIL",
    severity: "CRITICAL",
    evidence,
    impactSurface: "Platform/DesignAuthorityActivation",
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
  const governanceChecks: GovernanceCheckResult[] = [
    evaluateExtWeChat07(root),
    evaluateChainIntegrity01(root),
    evaluateChatGovernance01(root),
    evaluateGovAuth02Activation(root),
  ];

  const summary = {
    totalSubsystems: governanceChecks.length,
    passCount: governanceChecks.filter((check) => check.status === "PASS").length,
    failCount: governanceChecks.filter((check) => check.status === "FAIL").length,
    noDataCount: governanceChecks.filter((check) => String(check.status) === "NO_DATA").length,
  };

  const governanceBlockingFail = governanceChecks.some(
    (check) => check.severity === "CRITICAL" && check.status === "FAIL"
  );
  const overall: "PASS" | "FAIL" =
    summary.failCount > 0 || summary.noDataCount > 0 || governanceBlockingFail ? "FAIL" : "PASS";
  let trendStatus: TrendStatus = "STABLE";
  if (subsystems.some((subsystem) => subsystem.trendStatus === "REGRESSION") || overall === "FAIL") {
    trendStatus = "REGRESSION";
  } else if (subsystems.some((subsystem) => subsystem.trendStatus === "IMPROVING")) {
    trendStatus = "IMPROVING";
  }

  const ruleWeights: Record<string, number> = {
    "GOV-WECHAT-07": 8,
    "GOV-CHAIN-01": 12,
    // GOV-CHAT-01 remains binary critical gate; numeric deduction is currently zero by contract.
    "GOV-CHAT-01": 0,
    // GOV-AUTH-02-ACTIVATION remains binary critical gate; numeric deduction is currently zero by contract.
    "GOV-AUTH-02-ACTIVATION": 0,
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
  const badgeDegradeRuleIds = new Set([
    "GOV-WECHAT-07",
    "GOV-CHAIN-01",
    "GOV-CHAT-01",
    "GOV-AUTH-02-ACTIVATION",
  ]);
  const cryptographicIntegrity: "GREEN" | "RED" = governanceChecks.some(
    (check) => (check.id === "GOV-WECHAT-07" || check.id === "GOV-CHAIN-01") && check.status === "FAIL"
  )
    ? "RED"
    : "GREEN";

  let badgeState: PlatformGovernanceStatus["badgeState"] = "PASS";
  if (
    governanceChecks.some((check) => badgeDegradeRuleIds.has(check.id) && check.status === "FAIL")
  ) {
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
