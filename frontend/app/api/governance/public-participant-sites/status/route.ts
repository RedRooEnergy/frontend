import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function resolveRepoRoot() {
  const cwd = process.cwd();
  // In Next.js runtime, cwd is typically `frontend/`
  // Try common parent traversal to find `artefacts/`.
  const candidates = [cwd, path.resolve(cwd, ".."), path.resolve(cwd, "../.."), path.resolve(cwd, "../../..")] ;
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "artefacts"))) return c;
  }
  return cwd;
}

function listScorecardsNewestFirst(historyDir: string) {
  if (!fs.existsSync(historyDir)) return [];
  const files = fs
    .readdirSync(historyDir)
    .filter((name) => name.startsWith("scorecard.") && name.endsWith(".json"))
    .map((name) => path.join(historyDir, name));

  const withStats = files
    .map((filePath) => {
      try {
        const st = fs.statSync(filePath);
        return { filePath, mtimeMs: st.mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ filePath: string; mtimeMs: number }>;

  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withStats.map((x) => x.filePath);
}

export async function GET() {
  const root = resolveRepoRoot();
  const historyDir = path.join(root, "artefacts", "public-participant-sites", "history");

  const files = listScorecardsNewestFirst(historyDir);
  if (files.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "No scorecards found",
        latestRunId: null,
        overall: "FAIL",
        trendStatus: "STABLE",
        passCount: 0,
        failCount: 0,
      },
      { status: 200 }
    );
  }

  const latestPath = files[0];
  try {
    const raw = fs.readFileSync(latestPath, "utf8");
    const scorecard = JSON.parse(raw);

    const latestRunId = String(scorecard?.meta?.runId || "");
    const overall = String(scorecard?.summary?.overall || "FAIL");
    const trendStatus = String(scorecard?.summary?.trendStatus || "STABLE");
    const passCount = Number(scorecard?.summary?.passCount || 0);
    const failCount = Number(scorecard?.summary?.failCount || 0);
    const notBuiltCount = Number(scorecard?.summary?.notBuiltCount || 0);

    return NextResponse.json(
      {
        ok: true,
        latestRunId,
        overall,
        trendStatus,
        passCount,
        failCount,
        notBuiltCount,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to read latest scorecard",
        latestRunId: null,
        overall: "FAIL",
        trendStatus: "STABLE",
        passCount: 0,
        failCount: 0,
      },
      { status: 200 }
    );
  }
}
