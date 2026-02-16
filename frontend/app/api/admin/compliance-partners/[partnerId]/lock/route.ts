import { NextResponse } from "next/server";
import { lockCompliancePartner } from "../../../../../../lib/compliancePartner/serverStore";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";

export async function POST(request: Request, context: { params: { partnerId: string } }) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const item = await lockCompliancePartner(context.params.partnerId, admin.actorId);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to lock compliance partner" },
      { status: 500 }
    );
  }
}
