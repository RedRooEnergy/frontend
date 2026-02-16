import { NextResponse } from "next/server";
import { setCompliancePartnerStatus } from "../../../../../../lib/compliancePartner/serverStore";
import { CompliancePartnerStatus } from "../../../../../../lib/compliancePartner/types";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";

export async function POST(request: Request, context: { params: { partnerId: string } }) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = (await request.json()) as {
      status: CompliancePartnerStatus;
      reasonCode?: string;
      notes?: string;
    };
    if (!body.status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }
    const item = await setCompliancePartnerStatus(
      context.params.partnerId,
      body.status,
      admin.actorId,
      body.reasonCode,
      body.notes
    );
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update status" },
      { status: 500 }
    );
  }
}
