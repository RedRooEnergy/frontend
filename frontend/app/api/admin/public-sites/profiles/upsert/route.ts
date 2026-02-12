import { NextResponse, type NextRequest } from "next/server";
import { requireAdminActor } from "../../../../../../lib/public-sites/authz";
import { getOrCreateProfile, mapEntityPathToType } from "../../../../../../lib/public-sites/services/PublicSiteService";

export async function POST(request: NextRequest) {
  const guard = requireAdminActor(request);
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      entityId?: string;
      entityType?: string;
      desiredSlug?: string;
    };

    const entityId = String(body.entityId || "").trim();
    const entityType = mapEntityPathToType(String(body.entityType || ""));
    const desiredSlug = String(body.desiredSlug || "").trim();

    if (!entityId || !desiredSlug) {
      return NextResponse.json({ error: "entityId and desiredSlug are required" }, { status: 400 });
    }

    const profile = getOrCreateProfile({ entityId, entityType, desiredSlug });
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 400 });
  }
}
