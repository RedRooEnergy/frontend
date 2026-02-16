import { NextResponse } from "next/server";
import { ServicePartnerComplianceProfile } from "../../../../../lib/store";
import { getComplianceProfile, upsertComplianceProfile } from "../../../../../lib/servicePartner/serverStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const partnerId = searchParams.get("partnerId") || "";
  if (!partnerId) {
    return NextResponse.json({ error: "partnerId required" }, { status: 400 });
  }
  const profile = await getComplianceProfile(partnerId);
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ServicePartnerComplianceProfile;
    if (!body?.partnerId) {
      return NextResponse.json({ error: "Invalid profile payload." }, { status: 400 });
    }
    const existing = await getComplianceProfile(body.partnerId);
    if (existing?.status === "SUBMITTED") {
      return NextResponse.json({ error: "Profile is locked pending admin review." }, { status: 409 });
    }
    const next = await upsertComplianceProfile(body);
    return NextResponse.json({ profile: next });
  } catch (err) {
    return NextResponse.json({ error: "Unable to save profile." }, { status: 500 });
  }
}
