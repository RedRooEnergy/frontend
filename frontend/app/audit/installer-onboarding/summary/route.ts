import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

function resolveRepoRoot() {
  const cwd = process.cwd();

  const candidates = [
    cwd,
    path.resolve(cwd, ".."),
    path.resolve(cwd, "../.."),
    path.resolve(cwd, "../../.."),
    path.resolve(cwd, "../../../.."),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "artefacts", "installer-audit"))) {
      return candidate;
    }
  }

  const hasFrontendPackage = fs.existsSync(path.join(cwd, "package.json")) && fs.existsSync(path.join(cwd, "app"));
  return hasFrontendPackage ? path.resolve(cwd, "..") : cwd;
}

function safeRunId(input: string) {
  const runId = (input || "").trim();
  if (!runId) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(runId)) return null;
  return runId;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseSha256(filePath: string) {
  if (!fs.existsSync(filePath)) return "";
  const raw = fs.readFileSync(filePath, "utf8").trim();
  return raw.split(/\s+/)[0] || "";
}

function renderHtml(scorecard: any, sha256Value: string) {
  const meta = scorecard?.meta ?? {};
  const summary = scorecard?.summary ?? {};
  const checks: any[] = Array.isArray(scorecard?.checks) ? scorecard.checks : [];
  const outputs = scorecard?.outputs ?? {};

  const orderedChecks = checks
    .slice()
    .sort((a, b) => String(a?.id ?? "").localeCompare(String(b?.id ?? "")));

  const rows = orderedChecks
    .map((check) => {
      const id = escapeHtml(String(check?.id ?? ""));
      const title = escapeHtml(String(check?.title ?? ""));
      const status = escapeHtml(String(check?.status ?? "UNKNOWN"));
      const detailsRaw = String(check?.details ?? "");
      const details = escapeHtml(detailsRaw.length > 240 ? `${detailsRaw.slice(0, 240)}...` : detailsRaw);
      const isFail = status.toUpperCase() === "FAIL";
      const isNotBuilt = status.toUpperCase() === "NOT_BUILT";
      const cls = isFail ? "fail" : isNotBuilt ? "notbuilt" : "";
      return `<tr class="${cls}"><td>${id}</td><td>${title}</td><td>${status}</td><td>${details}</td></tr>`;
    })
    .join("\n");

  const pdfPath = escapeHtml(String(outputs?.pdfPath ?? ""));
  const shaPath = escapeHtml(String(outputs?.pdfSha256Path ?? ""));
  const shaValue = escapeHtml(String(sha256Value || "N/A"));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Installer Onboarding Audit Summary</title>
  <style>
    :root { --bg: #0b1220; --card: #0f172a; --text: #e5e7eb; --muted: #94a3b8; --border: rgba(148, 163, 184, 0.25); }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: Arial, sans-serif; }
    .wrap { max-width: 980px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    .meta { margin-top: 12px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; font-size: 12px; color: var(--text); }
    .meta .line { margin-top: 6px; }
    .grid { margin-top: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; }
    .k { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    .v { margin-top: 6px; font-size: 18px; font-weight: 700; }
    .overall { margin-top: 16px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; }
    .overall .v { font-size: 24px; }
    table { width: 100%; margin-top: 16px; border-collapse: collapse; background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    th, td { padding: 10px 12px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; font-size: 12px; }
    th { color: var(--muted); font-weight: 700; }
    tr.fail { background: rgba(220, 38, 38, 0.15); }
    tr.notbuilt { background: rgba(245, 158, 11, 0.12); }
    .outputs { margin-top: 16px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; font-size: 12px; }
    .outputs .line { margin-top: 6px; word-break: break-all; }
    .footer { margin-top: 12px; color: var(--muted); font-size: 11px; }
    @media print {
      body { background: #fff; color: #000; }
      .card, table, .outputs { border-color: #ddd; }
      tr.fail { background: #ffe3e3 !important; }
      tr.notbuilt { background: #fff6e5 !important; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Installer Onboarding Audit Summary</h1>
    <div class="meta">
      <div class="line"><strong>runId:</strong> ${escapeHtml(String(meta.runId ?? ""))}</div>
      <div class="line"><strong>timestampUtc:</strong> ${escapeHtml(String(meta.timestampUtc ?? ""))}</div>
      <div class="line"><strong>baseUrl:</strong> ${escapeHtml(String(meta.baseUrl ?? ""))}</div>
      <div class="line"><strong>environment:</strong> ${escapeHtml(String(meta.environment ?? ""))}</div>
    </div>

    <div class="overall">
      <div class="k">Overall (PASS-1)</div>
      <div class="v">${escapeHtml(String(summary.overall ?? ""))}</div>
    </div>

    <div class="grid">
      <div class="card"><div class="k">Total Checks</div><div class="v">${escapeHtml(String(summary.totalChecks ?? 0))}</div></div>
      <div class="card"><div class="k">PASS</div><div class="v">${escapeHtml(String(summary.passCount ?? 0))}</div></div>
      <div class="card"><div class="k">FAIL</div><div class="v">${escapeHtml(String(summary.failCount ?? 0))}</div></div>
      <div class="card"><div class="k">NOT_BUILT</div><div class="v">${escapeHtml(String(summary.notBuiltCount ?? 0))}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 14%">Check</th>
          <th style="width: 38%">Title</th>
          <th style="width: 12%">Status</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="outputs">
      <div class="k">Evidence Outputs</div>
      <div class="line">PDF path: ${pdfPath}</div>
      <div class="line">SHA file: ${shaPath}</div>
      <div class="line">SHA-256 value: ${shaValue}</div>
    </div>

    <div class="footer">
      PASS-2 results are non-blocking and not included in overall status.
    </div>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = safeRunId(searchParams.get("runId") || "");
  if (!runId) {
    return new Response("runId required", { status: 400 });
  }

  const rootDir = resolveRepoRoot();
  const scorecardPath = path.join(rootDir, "artefacts", "installer-audit", `scorecard.installer-onboarding.${runId}.json`);
  if (!fs.existsSync(scorecardPath)) {
    return new Response("scorecard not found", { status: 404 });
  }

  try {
    const scorecard = JSON.parse(fs.readFileSync(scorecardPath, "utf8"));
    const shaRelativePath = String(scorecard?.outputs?.pdfSha256Path || "");
    const shaAbsolutePath = path.resolve(rootDir, shaRelativePath);
    const sha256Value = shaRelativePath ? parseSha256(shaAbsolutePath) : "";
    const html = renderHtml(scorecard, sha256Value);
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response("unable to render summary", { status: 500 });
  }
}
