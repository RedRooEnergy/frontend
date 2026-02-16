import { NextResponse } from "next/server";
import { listCompliancePartners } from "../../../../lib/compliancePartner/serverStore";

function parseCertList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("categorySlug") || "";
  const requiredCerts = parseCertList(searchParams.get("requiredCerts"));

  try {
    const items = await listCompliancePartners({ status: "ACTIVE" });
    const filtered = items.filter((partner) =>
      requiredCerts.every((cert) => partner.scopes.certifications.includes(cert as any))
    );

    const ranked = filtered
      .map((partner) => {
        let score = 0;
        if (partner.status === "ACTIVE") score += 4;
        score += Math.max(0, 12 - partner.slaDays);
        if (categorySlug && partner.scopes.productCategories.includes(categorySlug)) score += 3;
        return { partner, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(({ partner }) => partner);

    return NextResponse.json({ items: ranked });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load recommendations" },
      { status: 500 }
    );
  }
}
