import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

function resolveRepoRoot() {
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(cwd, ".."), path.resolve(cwd, "../.."), path.resolve(cwd, "../../..")];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "artefacts"))) return candidate;
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

function readLatestSummary() {
  const root = resolveRepoRoot();
  const historyDir = path.join(root, "artefacts", "public-participant-sites", "history");
  const files = listScorecardsNewestFirst(historyDir);
  if (files.length === 0) {
    return {
      overall: "FAIL",
      trendStatus: "STABLE",
      passCount: 0,
      failCount: 0,
      hasData: false,
    };
  }

  try {
    const raw = fs.readFileSync(files[0], "utf8");
    const parsed = JSON.parse(raw);
    return {
      overall: String(parsed?.summary?.overall || "FAIL").toUpperCase(),
      trendStatus: String(parsed?.summary?.trendStatus || "STABLE").toUpperCase(),
      passCount: Number(parsed?.summary?.passCount || 0),
      failCount: Number(parsed?.summary?.failCount || 0),
      hasData: true,
    };
  } catch {
    return {
      overall: "FAIL",
      trendStatus: "STABLE",
      passCount: 0,
      failCount: 0,
      hasData: false,
    };
  }
}

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function computeBadgeState(overall: string, trendStatus: string, hasData: boolean) {
  if (!hasData) return { text: "NO_DATA", color: "#9f9f9f" };
  if (trendStatus === "REGRESSION") return { text: "REGRESSION", color: "#e05d44" };
  if (overall !== "PASS") return { text: "FAIL", color: "#e05d44" };
  if (trendStatus === "IMPROVING") return { text: "IMPROVING", color: "#007ec6" };
  if (trendStatus === "STABLE") return { text: "STABLE", color: "#4c1" };
  return { text: "PASS", color: "#4c1" };
}

function badgeWidth(text: string) {
  // Deterministic approximation for badge text width.
  return Math.max(64, text.length * 8 + 16);
}

function renderBadge(label: string, value: string, color: string) {
  const leftWidth = Math.max(120, label.length * 7 + 18);
  const rightWidth = badgeWidth(value);
  const totalWidth = leftWidth + rightWidth;
  const rightX = leftWidth;
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
    <rect x="${rightX}" width="${rightWidth}" height="20" fill="${color}"/>
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

export async function GET() {
  const { overall, trendStatus, hasData } = readLatestSummary();
  const state = computeBadgeState(overall, trendStatus, hasData);
  const label = "public-participant-sites";
  const svg = renderBadge(label, state.text, state.color);

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
    },
  });
}
