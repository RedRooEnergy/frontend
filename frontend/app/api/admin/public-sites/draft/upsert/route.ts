import { NextResponse, type NextRequest } from "next/server";
import { requireAdminActor } from "../../../../../../lib/public-sites/authz";
import { mapEntityPathToType, upsertDraft } from "../../../../../../lib/public-sites/services/PublicSiteService";

export async function POST(request: NextRequest) {
  const guard = requireAdminActor(request);
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      entityId?: string;
      entityType?: string;
      contentJSON?: Record<string, unknown>;
      seoMeta?: { title?: string; description?: string; ogImageAssetId?: string; canonicalPath?: string };
      heroImage?: string;
      logo?: string;
      desiredSlug?: string;
    };

    const out = upsertDraft({
      entityId: String(body.entityId || "").trim(),
      entityType: mapEntityPathToType(String(body.entityType || "")),
      userId: guard.actor.userId,
      contentJSON: (body.contentJSON || {}) as Record<string, unknown>,
      seoMeta: body.seoMeta,
      heroImage: body.heroImage,
      logo: body.logo,
      desiredSlug: body.desiredSlug,
    });

    return NextResponse.json(out);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 400 });
  }
}
