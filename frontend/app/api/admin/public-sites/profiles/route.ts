import { NextResponse, type NextRequest } from "next/server";
import { requireAdminActor } from "../../../../../lib/public-sites/authz";
import { listAdminProfiles } from "../../../../../lib/public-sites/services/PublicSiteService";

export async function GET(request: NextRequest) {
  const guard = requireAdminActor(request);
  if (!guard.ok) return guard.response;

  try {
    const entityType = request.nextUrl.searchParams.get("entityType") || undefined;
    const rows = listAdminProfiles(entityType || undefined);
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 400 });
  }
}
