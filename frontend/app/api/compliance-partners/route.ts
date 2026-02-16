import { NextResponse } from "next/server";
import { listCompliancePartners } from "../../../lib/compliancePartner/serverStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const certification = searchParams.get("certification") || undefined;
  const category = searchParams.get("category") || undefined;
  const jurisdiction = searchParams.get("jurisdiction") || undefined;
  const city = searchParams.get("city") || undefined;

  try {
    const items = await listCompliancePartners({
      status: "ACTIVE",
      certification,
      category,
      jurisdiction,
      city,
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load compliance partners" },
      { status: 500 }
    );
  }
}
