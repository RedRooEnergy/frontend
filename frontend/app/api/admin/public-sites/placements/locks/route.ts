import { NextResponse, type NextRequest } from "next/server";
import { requireAdminActor } from "../../../../../../lib/public-sites/authz";
import { getLocksForWeek } from "../../../../../../lib/public-sites/services/PlacementEngineService";

export async function GET(request: NextRequest) {
  const guard = requireAdminActor(request);
  if (!guard.ok) return guard.response;

  const weekId = String(request.nextUrl.searchParams.get("weekId") || "");
  return NextResponse.json({ rows: getLocksForWeek(weekId) });
}
