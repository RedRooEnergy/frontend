import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

function resolveRepoRoot() {
  const cwd = process.cwd();

  // Next dev/prod can run with different working directories depending on how the server is started.
  // We resolve the repo root by searching upwards for the expected audit artefact directory.
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

function renderHtml(scorecard: any) {
  const meta = scorecard?.meta ?? {};
  const run = scorecard?.run ?? {};
  const summary = scorecard?.summary ?? {};
  const counts = summary?.counts ?? {};
  const checks: any[] = Array.isArray(scorecard?.checks) ? scorecard.checks : [];

  const rows = checks
    .map((check) => {
      const id = escapeHtml(String(check?.id ?? ""));
      const title = escapeHtml(String(check?.title ?? ""));
      const status = escapeHtml(String(check?.status ?? "UNKNOWN"));
      const detailsRaw = String(check?.details ?? "");
      const details = escapeHtml(detailsRaw.length > 240 ? `${detailsRaw.slice(0, 240)}…` : detailsRaw);
      const isFail = status.toUpperCase() === "FAIL";
      const isNotBuilt = status.toUpperCase() === "NOT_BUILT";
      const cls = isFail ? "fail" : isNotBuilt ? "notbuilt" : "";
      return `<tr class="${cls}"><td>${id}</td><td>${title}</td><td>${status}</td><td>${details}</td></tr>`;
    })
    .join("\n");

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
    .meta { color: var(--muted); font-size: 12px; }
    .grid { margin-top: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; }
    .k { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    .v { margin-top: 6px; font-size: 18px; font-weight: 700; }
    table { width: 100%; margin-top: 16px; border-collapse: collapse; background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    th, td { padding: 10px 12px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; font-size: 12px; }
    th { color: var(--muted); font-weight: 700; }
    tr.fail { background: rgba(220, 38, 38, 0.15); }
    tr.notbuilt { background: rgba(245, 158, 11, 0.12); }
    .footer { margin-top: 12px; color: var(--muted); font-size: 11px; }
    @media print {
      body { background: #fff; color: #000; }
      .card, table { border-color: #ddd; }
      tr.fail { background: #ffe3e3 !important; }
      tr.notbuilt { background: #fff6e5 !important; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Installer Onboarding Audit Summary</h1>
    <div class="meta">
      Run ID: ${escapeHtml(String(meta.auditId ?? ""))} |
      Base URL: ${escapeHtml(String(run.baseUrl ?? ""))} |
      Env: ${escapeHtml(String(meta.environment ?? ""))} |
      Timestamp: ${escapeHtml(String(run.timestampUtc ?? ""))}
    </div>

    <div class="grid">
      <div class="card"><div class="k">Overall</div><div class="v">${escapeHtml(String(summary.overall ?? ""))}</div></div>
      <div class="card"><div class="k">PASS</div><div class="v">${escapeHtml(String(counts.pass ?? 0))}</div></div>
      <div class="card"><div class="k">FAIL</div><div class="v">${escapeHtml(String(counts.fail ?? 0))}</div></div>
      <div class="card"><div class="k">NOT_BUILT</div><div class="v">${escapeHtml(String(counts.notBuilt ?? 0))}</div></div>
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

    <div class="footer">
      One-page summary intended for audit evidence packs. No PII is rendered.
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
    const html = renderHtml(scorecard);
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response("unable to render summary", { status: 500 });
  }
}
