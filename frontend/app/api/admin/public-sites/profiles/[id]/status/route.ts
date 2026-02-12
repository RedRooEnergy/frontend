import { NextResponse, type NextRequest } from "next/server";
import { requireAdminActor } from "../../../../../../../lib/public-sites/authz";
import { updateProfileStatus } from "../../../../../../../lib/public-sites/services/PublicSiteService";

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const guard = requireAdminActor(request);
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      approvalStatus?: string;
      certificationStatus?: string;
      insuranceStatus?: string;
      verificationBadges?: {
        rreVerified?: boolean;
        complianceVerified?: boolean;
        insuranceVerified?: boolean;
      };
    };

    const profile = updateProfileStatus({
      profileId: context.params.id,
      approvalStatus: body.approvalStatus,
      certificationStatus: body.certificationStatus,
      insuranceStatus: body.insuranceStatus,
      verificationBadges: body.verificationBadges,
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 400 });
  }
}
