import { NextResponse, type NextRequest } from "next/server";
import { requireAdminActor } from "../../../../../lib/public-sites/authz";
import { listAdminSnapshots } from "../../../../../lib/public-sites/services/PublicSiteService";

export async function GET(request: NextRequest) {
  const guard = requireAdminActor(request);
  if (!guard.ok) return guard.response;

  try {
    const entityId = request.nextUrl.searchParams.get("entityId") || undefined;
    const entityType = request.nextUrl.searchParams.get("entityType") || undefined;
    const rows = listAdminSnapshots({ entityId, entityType });
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 400 });
  }
}
