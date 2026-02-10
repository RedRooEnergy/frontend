import fs from "node:fs";
import path from "node:path";

type ClauseIndexEntry = {
  title: string;
  pdfPage: number;
};

type ClauseIndex = Record<string, ClauseIndexEntry>;
type ChkClauseMap = Record<string, string[]>;

type ScorecardCheck = {
  checkId?: string;
  id?: string;
  status?: string;
  [key: string]: unknown;
};

type Scorecard = {
  runId?: string;
  checks?: ScorecardCheck[];
  [key: string]: unknown;
};

export type EnrichOptions = {
  scorecardPath: string;
  clauseIndexPath: string;
  chkMapPath: string;
  pdfFileName?: string;
};

function resolveCheckId(check: ScorecardCheck) {
  return (check.checkId ?? check.id ?? "").toString();
}

function buildPdfLink(pdfFileName: string, pdfPage: number) {
  return `file://${pdfFileName}#page=${pdfPage}`;
}

export function enrichScorecard(options: EnrichOptions) {
  const {
    scorecardPath,
    clauseIndexPath,
    chkMapPath,
    pdfFileName = "EXT-BUYER-01_GOVERNANCE_PACK_v1.0.pdf",
  } = options;

  const scorecard = JSON.parse(fs.readFileSync(scorecardPath, "utf8")) as Scorecard;
  const clauseIndex = JSON.parse(fs.readFileSync(clauseIndexPath, "utf8")) as ClauseIndex;
  const chkMap = JSON.parse(fs.readFileSync(chkMapPath, "utf8")) as ChkClauseMap;

  const checks = scorecard.checks ?? [];
  for (const check of checks) {
    const checkId = resolveCheckId(check);
    if (!checkId.startsWith("CHK-")) continue;
    if (!chkMap[checkId]) {
      throw new Error(`Missing clause mapping for ${checkId}`);
    }
    for (const clauseId of chkMap[checkId]) {
      if (!clauseIndex[clauseId]) {
        throw new Error(`Missing clause ${clauseId} for ${checkId}`);
      }
    }
  }

  const enrichedChecks = checks.map((check) => {
    const checkId = resolveCheckId(check);
    if (!checkId.startsWith("CHK-")) return check;
    if (String(check.status).toUpperCase() !== "FAIL") return check;

    const clauseIds = chkMap[checkId] ?? [];
    const clauses = clauseIds.map((clauseId) => {
      const entry = clauseIndex[clauseId];
      return {
        clauseId,
        title: entry.title,
        pdfPage: entry.pdfPage,
        pdfLink: buildPdfLink(pdfFileName, entry.pdfPage),
      };
    });

    return { ...check, clauses };
  });

  const enrichedScorecard = { ...scorecard, checks: enrichedChecks };
  fs.writeFileSync(scorecardPath, JSON.stringify(enrichedScorecard, null, 2));

  const htmlPath = path.join(path.dirname(scorecardPath), "scorecard.html");
  fs.writeFileSync(htmlPath, renderScorecardHtml(enrichedChecks, pdfFileName));

  return enrichedScorecard;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderScorecardHtml(checks: ScorecardCheck[], pdfFileName: string) {
  const rows = checks.map((check) => {
    const checkId = escapeHtml(resolveCheckId(check) || "");
    const status = escapeHtml(String(check.status ?? "UNKNOWN"));
    const isFail = status.toUpperCase() === "FAIL";
    const clauseLinks =
      isFail && Array.isArray((check as { clauses?: unknown }).clauses)
        ? (check as { clauses: { clauseId: string; title: string; pdfPage: number }[] })
            .clauses.map((clause) => {
              const link = buildPdfLink(pdfFileName, clause.pdfPage);
              return `<a href="${link}">${escapeHtml(clause.clauseId)} — ${escapeHtml(
                clause.title
              )}</a>`;
            })
            .join("<br />")
        : "";
    return `<tr class="${isFail ? "fail" : ""}"><td>${checkId}</td><td>${status}</td><td>${clauseLinks}</td></tr>`;
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Buyer Audit Scorecard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f4f4f4; }
    tr.fail { background: #ffe3e3; }
  </style>
</head>
<body>
  <h1>Buyer Audit Scorecard</h1>
  <table>
    <thead>
      <tr>
        <th>Check ID</th>
        <th>Status</th>
        <th>Governance Clause Links</th>
      </tr>
    </thead>
    <tbody>
      ${rows.join("\n")}
    </tbody>
  </table>
</body>
</html>`;
}

async function runCli() {
  const scorecardPath = process.argv[2];
  if (!scorecardPath) {
    throw new Error("Usage: tsx enrich-scorecard.ts <scorecardPath>");
  }

  const rootDir = path.resolve(process.cwd(), "..");
  const clauseIndexPath = path.join(
    rootDir,
    "docs",
    "extensions",
    "EXT-BUYER-01",
    "CLAUSE_INDEX.json"
  );
  const chkMapPath = path.join(rootDir, "audits", "EXT-BUYER-01", "chk-to-clause.map.json");

  enrichScorecard({ scorecardPath, clauseIndexPath, chkMapPath });
}

if (process.argv[1] && process.argv[1].includes("enrich-scorecard")) {
  runCli().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}
