import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { runCheck as runActivationRegisterCheck } from "./activation-register-check.mjs";
import { runCheck as runClosedRoleSetCheck } from "./closed-role-set-check.mjs";
import { runCheck as runEndpointInventoryCheck } from "./endpoint-inventory-check.mjs";
import {
  loadConfig,
  nowUtcIso,
  runGit,
  sha256Hex,
  stableStringify,
  writeJsonFile
} from "./_lib.mjs";

export async function runScorecard(repoRoot = process.cwd()) {
  const config = await loadConfig(repoRoot);
  const checks = [
    await runEndpointInventoryCheck(repoRoot),
    await runClosedRoleSetCheck(repoRoot),
    await runActivationRegisterCheck(repoRoot)
  ];

  const generatedAtUtc = nowUtcIso();
  const commitSha = runGit(repoRoot, ["rev-parse", "HEAD"]);
  const branch = runGit(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const overall = checks.every((check) => check.pass) ? "PASS" : "FAIL";

  const payload = {
    generatedAtUtc,
    commitSha,
    branch,
    checks: checks.map((check) => ({
      name: check.name,
      pass: check.pass,
      summary: check.summary,
      findingsCount: check.findings.length,
      findings: check.findings,
      warningsCount: (check.warnings || []).length,
      warnings: check.warnings || []
    })),
    overall
  };

  const scorecard = {
    ...payload,
    sha256: sha256Hex(stableStringify(payload))
  };

  const outputAbs = path.join(repoRoot, config.scorecardOutputPath);
  await writeJsonFile(outputAbs, scorecard);
  return { scorecard, outputAbs };
}

const isDirectRun = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isDirectRun) {
  const { scorecard, outputAbs } = await runScorecard();
  process.stdout.write(
    `${scorecard.overall}: wrote scorecard -> ${path.relative(
      process.cwd(),
      outputAbs
    )}\n`
  );
  process.exit(scorecard.overall === "PASS" ? 0 : 1);
}
