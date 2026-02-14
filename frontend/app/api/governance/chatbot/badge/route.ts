import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

function resolveScorecardPath() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "../scorecards/chatbot.scorecard.json"),
    path.join(cwd, "scorecards/chatbot.scorecard.json"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderBadge(label: string, value: string, color: string) {
  const leftWidth = Math.max(96, label.length * 7 + 18);
  const rightWidth = Math.max(56, value.length * 8 + 16);
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

function readOverall() {
  const filePath = resolveScorecardPath();
  if (!fs.existsSync(filePath)) {
    return "NO_DATA";
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return String(parsed?.overall || "FAIL").toUpperCase();
  } catch {
    return "FAIL";
  }
}

export async function GET() {
  const overall = readOverall();
  const color = overall === "PASS" ? "#4c1" : overall === "NO_DATA" ? "#9f9f9f" : "#e05d44";
  const svg = renderBadge("chatbot-audit", overall, color);

  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
    },
  });
}
