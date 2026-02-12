import { NextResponse, type NextRequest } from "next/server";
import { requireAdminActor } from "../../../../../lib/public-sites/authz";
import { mapEntityPathToType, suspendPublicSite } from "../../../../../lib/public-sites/services/PublicSiteService";

export async function POST(request: NextRequest) {
  const guard = requireAdminActor(request);
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json().catch(() => ({}))) as { entityId?: string; entityType?: string };
    const out = suspendPublicSite({
      entityId: String(body.entityId || "").trim(),
      entityType: mapEntityPathToType(String(body.entityType || "")),
      adminId: guard.actor.userId,
    });
    return NextResponse.json(out);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 400 });
  }
}
