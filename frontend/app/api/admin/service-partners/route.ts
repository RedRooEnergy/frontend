import { NextResponse } from "next/server";
import { getComplianceProfiles } from "../../../../lib/servicePartner/serverStore";
import { getDevServicePartnerProfiles } from "../../../../lib/servicePartner/devSeed";
import { requireAdmin } from "../../../../lib/auth/adminGuard";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ profiles: getDevServicePartnerProfiles(), devFallback: true });
  }
  try {
    const profiles = await getComplianceProfiles();
    return NextResponse.json({ profiles });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unable to load profiles." }, { status: 500 });
  }
}
