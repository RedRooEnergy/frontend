import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type AuditStatus = "PASS" | "FAIL" | "NOT_BUILT" | "NOT_APPLICABLE";

export type AuditCheck = {
  id: string;
  title: string;
  status: AuditStatus;
  details: string;
  evidence: {
    files: string[];
    notes: string;
  };
};

type RunOptions = {
  auditId: string;
  slug: string;
  checks: AuditCheck[];
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function resolveRepoRoot() {
  const cwd = process.cwd();
  const isFrontendCwd = fs.existsSync(path.join(cwd, "package.json")) && fs.existsSync(path.join(cwd, "app"));
  return isFrontendCwd ? path.resolve(cwd, "..") : cwd;
}

export const REPO_ROOT = resolveRepoRoot();

export function fileExists(relPath: string) {
  return fs.existsSync(path.join(REPO_ROOT, relPath));
}

export function fileContains(relPath: string, pattern: string | RegExp) {
  const absPath = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(absPath)) return false;
  const source = fs.readFileSync(absPath, "utf8");
  if (typeof pattern === "string") return source.includes(pattern);
  return pattern.test(source);
}

export function nowIso() {
  return new Date().toISOString();
}

export function runId() {
  const stamp = new Date().toISOString().replace(/\W/g, "");
  const suffix = crypto.randomBytes(4).toString("hex");
  return `${stamp}--${suffix}`;
}

export function buildCheck(
  id: string,
  title: string,
  pass: boolean,
  passDetails: string,
  failDetails: string,
  evidenceFiles: string[] = []
): AuditCheck {
  return {
    id,
    title,
    status: pass ? "PASS" : "FAIL",
    details: pass ? passDetails : failDetails,
    evidence: { files: evidenceFiles, notes: "" },
  };
}

export function writeScorecard(options: RunOptions) {
  const run = runId();
  const outDir = path.join(REPO_ROOT, "artefacts", `${options.slug}-audit`);
  ensureDir(outDir);

  const summary = {
    overall: options.checks.every((check) => check.status === "PASS") ? "PASS" : "FAIL",
    totalChecks: options.checks.length,
    passCount: options.checks.filter((check) => check.status === "PASS").length,
    failCount: options.checks.filter((check) => check.status === "FAIL").length,
    notBuiltCount: options.checks.filter((check) => check.status === "NOT_BUILT").length,
    notApplicableCount: options.checks.filter((check) => check.status === "NOT_APPLICABLE").length,
  } as const;

  const scorecard = {
    meta: {
      auditId: options.auditId,
      runId: run,
      timestampUtc: nowIso(),
      baseUrl: "code-static",
      environment: process.env.CI ? "ci" : "local",
    },
    summary,
    checks: options.checks,
  };

  const outPath = path.join(outDir, `scorecard.${options.slug}.${run}.json`);
  fs.writeFileSync(outPath, JSON.stringify(scorecard, null, 2));

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scorecardPath: path.relative(REPO_ROOT, outPath), overall: summary.overall }, null, 2));
  for (const check of options.checks) {
    // eslint-disable-next-line no-console
    console.log(`${check.status} - ${check.id}: ${check.details}`);
  }

  if (summary.overall !== "PASS") {
    process.exitCode = 1;
  }
}
