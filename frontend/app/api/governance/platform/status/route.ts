import { NextResponse } from "next/server";
import { getPlatformGovernanceStatus } from "../_lib";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getPlatformGovernanceStatus();
  return NextResponse.json(status, { status: 200 });
}
