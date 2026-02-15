import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  capFindings,
  checkResult,
  extractRoleCandidatesFromCode,
  fileExists,
  lineFromIndex,
  listFilesRecursively,
  loadConfig,
  parseClosedRoleDataFromAppendix
} from "./_lib.mjs";

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

export async function runCheck(repoRoot = process.cwd()) {
  const config = await loadConfig(repoRoot);
  const appendixAbs = path.join(repoRoot, config.appendixAPath);
  const appendixText = await fs.readFile(appendixAbs, "utf8");
  const roleData = parseClosedRoleDataFromAppendix(appendixText);

  const closedRoleSet = new Set(roleData.closedRoles);
  const aliasSet = new Set(roleData.aliasRoles);
  const findings = [];

  const sourceFiles = [];
  for (const rel of config.rbacScanRoots) {
    const abs = path.join(repoRoot, rel);
    if (!(await fileExists(abs))) {
      continue;
    }
    const stat = await fs.stat(abs);
    if (stat.isFile()) {
      sourceFiles.push(abs);
      continue;
    }
    const files = await listFilesRecursively(
      abs,
      new Set([".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs"])
    );
    sourceFiles.push(...files);
  }

  const unknownRoles = new Set();
  const aliasAsRuntimeRoles = new Set();

  for (const file of sortedUnique(sourceFiles)) {
    const text = await fs.readFile(file, "utf8");
    const candidates = extractRoleCandidatesFromCode(text);
    for (const candidate of candidates) {
      const role = candidate.value;
      const line = lineFromIndex(text, candidate.index);

      if (!closedRoleSet.has(role)) {
        unknownRoles.add(role);
        findings.push({
          severity: "ERROR",
          code: "UNKNOWN_RUNTIME_ROLE_KEY",
          role,
          file: path.relative(repoRoot, file).replace(/\\/g, "/"),
          line
        });
      }
      if (aliasSet.has(role)) {
        aliasAsRuntimeRoles.add(role);
        findings.push({
          severity: "ERROR",
          code: "GOVERNANCE_ALIAS_USED_AS_RUNTIME_ROLE",
          role,
          file: path.relative(repoRoot, file).replace(/\\/g, "/"),
          line
        });
      }
    }
  }

  const pass = findings.length === 0;
  const summary = pass
    ? `PASS: role keys constrained to Appendix A closed set (${roleData.closedRoles.length} keys).`
    : `FAIL: unknown runtime roles=${unknownRoles.size}; alias-runtime collisions=${aliasAsRuntimeRoles.size}.`;

  return checkResult(
    "closed-role-set-check",
    pass,
    summary,
    capFindings(findings, config.maxFindings)
  );
}

const isDirectRun = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isDirectRun) {
  const result = await runCheck();
  process.stdout.write(`${result.summary}\n`);
  if (result.findings.length > 0) {
    process.stdout.write(
      `${JSON.stringify(result.findings.slice(0, 50), null, 2)}\n`
    );
  }
  process.exit(result.pass ? 0 : 1);
}
