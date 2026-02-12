import { NextResponse } from "next/server";
import { getPublishedBySlug, mapEntityPathToType } from "../../../../../../lib/public-sites/services/PublicSiteService";

export async function GET(_: Request, context: { params: { entityType: string; slug: string } }) {
  try {
    const entityType = mapEntityPathToType(context.params.entityType);
    const slug = String(context.params.slug || "").toLowerCase();
    const result = getPublishedBySlug({ entityType, slug });

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if ((result as any).suspended) {
      return NextResponse.json({ error: "Gone", suspended: true }, { status: 410 });
    }

    const payload = result as { profile: any; snapshot: any };
    return NextResponse.json({
      entityType,
      slug,
      version: payload.snapshot.version,
      publishedAt: payload.snapshot.publishedAt,
      seoMeta: payload.snapshot.seoMeta || {},
      heroImage: payload.snapshot.heroImage || "",
      logo: payload.snapshot.logo || "",
      contentJSON: payload.snapshot.contentJSON || {},
      trust: {
        approvalStatus: payload.profile.approvalStatus,
        certificationStatus: payload.profile.certificationStatus,
        insuranceStatus: payload.profile.insuranceStatus,
        badges: payload.profile.verificationBadges,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
