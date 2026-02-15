import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  capFindings,
  checkResult,
  loadConfig,
  runGit
} from "./_lib.mjs";

const REQUIRED_COLUMNS = [
  "surfaceName",
  "state",
  "stateEffectiveAtUTC",
  "activatedAtCommit",
  "ciArtefactHash",
  "manifestHash",
  "ratifiedBy",
  "dmsRow",
  "notes"
];

function parseMarkdownTable(registerText) {
  const lines = registerText.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.trim().startsWith("| surfaceName ")
  );
  if (headerIndex < 0 || headerIndex + 2 >= lines.length) {
    throw new Error("Activation register table header not found.");
  }

  const header = lines[headerIndex]
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

  const rows = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    if (!raw.startsWith("|")) {
      break;
    }
    if (/^\|\s*-+\s*\|/.test(raw)) {
      continue;
    }
    const cells = raw
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length !== header.length) {
      continue;
    }
    const obj = {};
    for (let j = 0; j < header.length; j += 1) {
      obj[header[j]] = cells[j];
    }
    obj.__line = i + 1;
    rows.push(obj);
  }
  return { header, rows };
}

function extractBacktickedTags(notes) {
  const tags = [];
  let m;
  const re = /`([^`]+)`/g;
  while ((m = re.exec(notes || "")) !== null) {
    const token = m[1];
    if (
      token.includes("baseline") ||
      token.startsWith("governance-") ||
      token.startsWith("release-")
    ) {
      tags.push(token);
    }
  }
  return tags;
}

function isExplicitBoardResolution(notes) {
  return /board resolution/i.test(notes || "");
}

export async function runCheck(repoRoot = process.cwd()) {
  const config = await loadConfig(repoRoot);
  const registerAbs = path.join(repoRoot, config.activationRegisterPath);
  const registerText = await fs.readFile(registerAbs, "utf8");

  const findings = [];

  let parsed;
  try {
    parsed = parseMarkdownTable(registerText);
  } catch (error) {
    return checkResult(
      "activation-register-check",
      false,
      `FAIL: ${error.message}`,
      [{ severity: "ERROR", code: "MALFORMED_REGISTER", message: error.message }]
    );
  }

  const headerKey = parsed.header.join("|");
  const requiredHeaderKey = REQUIRED_COLUMNS.join("|");
  if (headerKey !== requiredHeaderKey) {
    findings.push({
      severity: "ERROR",
      code: "REGISTER_COLUMNS_INVALID",
      expected: REQUIRED_COLUMNS,
      found: parsed.header
    });
  }

  const allowedStates = new Set(config.allowedStates);
  const stateOrder = new Map(config.stateOrder.map((s, i) => [s, i]));
  const bySurface = new Map();

  for (const row of parsed.rows) {
    const state = row.state;
    if (!allowedStates.has(state)) {
      findings.push({
        severity: "ERROR",
        code: "INVALID_STATE",
        line: row.__line,
        state
      });
    }

    if (state === "ACTIVATED" && row.activatedAtCommit === "N/A") {
      findings.push({
        severity: "ERROR",
        code: "ACTIVATED_WITHOUT_COMMIT",
        line: row.__line,
        surfaceName: row.surfaceName
      });
    }

    if (row.activatedAtCommit !== "N/A") {
      try {
        runGit(repoRoot, ["cat-file", "-e", `${row.activatedAtCommit}^{commit}`]);
      } catch {
        findings.push({
          severity: "ERROR",
          code: "ACTIVATED_COMMIT_NOT_FOUND",
          line: row.__line,
          surfaceName: row.surfaceName,
          activatedAtCommit: row.activatedAtCommit
        });
      }
    }

    const tags = extractBacktickedTags(row.notes);
    for (const tag of tags) {
      try {
        runGit(repoRoot, ["rev-parse", `${tag}^{commit}`]);
      } catch {
        findings.push({
          severity: "ERROR",
          code: "BASELINE_TAG_NOT_FOUND",
          line: row.__line,
          surfaceName: row.surfaceName,
          tag
        });
      }
    }

    if (!bySurface.has(row.surfaceName)) {
      bySurface.set(row.surfaceName, []);
    }
    bySurface.get(row.surfaceName).push(row);
  }

  for (const [surfaceName, rows] of bySurface.entries()) {
    for (let i = 1; i < rows.length; i += 1) {
      const prev = rows[i - 1];
      const curr = rows[i];

      if (curr.state === "FROZEN") {
        continue;
      }

      if (prev.state === "FROZEN") {
        if (!isExplicitBoardResolution(curr.notes)) {
          findings.push({
            severity: "ERROR",
            code: "REACTIVATION_WITHOUT_BOARD_RESOLUTION_NOTE",
            surfaceName,
            line: curr.__line
          });
        }
        continue;
      }

      const prevOrder = stateOrder.get(prev.state);
      const currOrder = stateOrder.get(curr.state);
      if (prevOrder === undefined || currOrder === undefined) {
        continue;
      }

      const isSame = currOrder === prevOrder;
      const isNext = currOrder === prevOrder + 1;
      if (!isSame && !isNext) {
        findings.push({
          severity: "ERROR",
          code: "INVALID_STATE_SEQUENCE",
          surfaceName,
          line: curr.__line,
          previousState: prev.state,
          currentState: curr.state
        });
      }
    }
  }

  const pass = findings.length === 0;
  const summary = pass
    ? `PASS: activation register valid with ${parsed.rows.length} row(s).`
    : `FAIL: activation register has ${findings.length} issue(s).`;

  return checkResult(
    "activation-register-check",
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
