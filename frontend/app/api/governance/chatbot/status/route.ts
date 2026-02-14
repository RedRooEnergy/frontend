import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

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

export async function GET() {
  const scorecardPath = resolveScorecardPath();
  if (!fs.existsSync(scorecardPath)) {
    return NextResponse.json(
      {
        extensionId: "EXT-CHAT-01",
        overall: "NO_DATA",
        totalChecks: 0,
        passCount: 0,
        failCount: 0,
        checks: [],
      },
      { status: 200 }
    );
  }

  try {
    const raw = fs.readFileSync(scorecardPath, "utf8");
    return NextResponse.json(JSON.parse(raw), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid chatbot scorecard" }, { status: 500 });
  }
}
