import { NextResponse } from "next/server";
import { getComplianceProfile } from "../../../../../lib/servicePartner/serverStore";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";

export async function GET(request: Request, { params }: { params: { partnerId: string } }) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await getComplianceProfile(params.partnerId);
  return NextResponse.json({ profile });
}
