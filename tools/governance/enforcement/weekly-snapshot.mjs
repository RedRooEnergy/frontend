import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { runScorecard } from "./governance-scorecard-check.mjs";
import {
  nowUtcIso,
  runGit,
  sha256Hex,
  stableStringify,
  writeJsonFile
} from "./_lib.mjs";

const INDEX_REL_PATH = "docs/governance/GOVERNANCE_WEEKLY_SNAPSHOT_INDEX.md";
const SNAPSHOT_DIR_REL_PATH = "docs/governance/snapshots";
const META_REL_PATH = "artifacts/governance/weekly-snapshot-meta.json";

function toSnapshotStamp(isoUtc) {
  return isoUtc.replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
}

async function ensureIndexFile(indexAbsPath) {
  try {
    await fs.access(indexAbsPath);
  } catch {
    const template = `# GOVERNANCE WEEKLY SNAPSHOT INDEX
Document ID: RRE-GOV-WEEKLY-SNAPSHOT-INDEX-v1.0  
Version: v1.0  
Status: ACTIVE LEDGER  
Classification: Governance Snapshot Ledger  
Primary Series: 00 – Project Definition & Governance

## Entries

| snapshotId | generatedAtUtc | commitSha | branch | overall | scorecardSha256 | artifactPath | workflowRunId | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
`;
    await fs.mkdir(path.dirname(indexAbsPath), { recursive: true });
    await fs.writeFile(indexAbsPath, template, "utf8");
  }
}

async function appendIndexRow(indexAbsPath, row) {
  const current = await fs.readFile(indexAbsPath, "utf8");
  const content = current.endsWith("\n") ? current : `${current}\n`;
  await fs.writeFile(indexAbsPath, `${content}${row}\n`, "utf8");
}

export async function runWeeklySnapshot(repoRoot = process.cwd()) {
  const generatedAtUtc = nowUtcIso();
  const stamp = toSnapshotStamp(generatedAtUtc);
  const snapshotId = `weekly-${stamp}`;

  const { scorecard, outputAbs } = await runScorecard(repoRoot);

  const commitSha = runGit(repoRoot, ["rev-parse", "HEAD"]);
  const branch =
    process.env.GOVERNANCE_SOURCE_BRANCH ||
    process.env.GITHUB_REF_NAME ||
    runGit(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const workflowRunId = process.env.GITHUB_RUN_ID || "LOCAL";

  const snapshotFileName = `governance-snapshot-${stamp}.json`;
  const snapshotRelPath = `${SNAPSHOT_DIR_REL_PATH}/${snapshotFileName}`;
  const snapshotAbsPath = path.join(repoRoot, snapshotRelPath);

  const scorecardRelPath = path
    .relative(repoRoot, outputAbs)
    .replace(/\\/g, "/");

  const snapshotPayload = {
    snapshotId,
    generatedAtUtc,
    commitSha,
    branch,
    overall: scorecard.overall,
    scorecardSha256: scorecard.sha256,
    scorecardPath: scorecardRelPath,
    workflowRunId,
    checks: scorecard.checks
  };
  const snapshot = {
    ...snapshotPayload,
    sha256: sha256Hex(stableStringify(snapshotPayload))
  };

  await writeJsonFile(snapshotAbsPath, snapshot);

  const indexAbsPath = path.join(repoRoot, INDEX_REL_PATH);
  await ensureIndexFile(indexAbsPath);
  const notes =
    scorecard.overall === "PASS"
      ? "Weekly governance snapshot recorded."
      : "ENFORCEMENT_FAIL: governance scorecard returned FAIL.";

  const row = `| ${snapshotId} | ${generatedAtUtc} | ${commitSha} | ${branch} | ${scorecard.overall} | ${scorecard.sha256} | ${snapshotRelPath} | ${workflowRunId} | ${notes} |`;
  await appendIndexRow(indexAbsPath, row);

  const meta = {
    generatedAtUtc,
    snapshotId,
    snapshotPath: snapshotRelPath,
    snapshotSha256: snapshot.sha256,
    scorecardPath: scorecardRelPath,
    scorecardSha256: scorecard.sha256,
    overall: scorecard.overall,
    workflowRunId,
    pass: scorecard.overall === "PASS"
  };

  await writeJsonFile(path.join(repoRoot, META_REL_PATH), meta);
  return meta;
}

const isDirectRun = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isDirectRun) {
  const result = await runWeeklySnapshot();
  process.stdout.write(
    `${result.pass ? "PASS" : "FAIL"}: weekly snapshot -> ${
      result.snapshotPath
    }\n`
  );
  process.exit(result.pass ? 0 : 1);
}
