import { compliancePartners } from "../../data/compliancePartners";
import type { CompliancePartnerView } from "./view";
import { toCompliancePartnerViewFromFallback, toCompliancePartnerViewFromRecord } from "./view";

const FALLBACK_VIEW = compliancePartners.map(toCompliancePartnerViewFromFallback);

function toQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return query.toString();
}

export async function fetchCompliancePartnersView(filters?: {
  certification?: string;
  category?: string;
  jurisdiction?: string;
  city?: string;
}): Promise<CompliancePartnerView[]> {
  try {
    const query = toQuery(filters || {});
    const res = await fetch(`/api/compliance-partners${query ? `?${query}` : ""}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Unable to load compliance partners");
    const data = await res.json();
    return (data.items || []).map(toCompliancePartnerViewFromRecord);
  } catch (error) {
    return FALLBACK_VIEW;
  }
}

export async function fetchRecommendedCompliancePartnersView(params: {
  categorySlug: string;
  requiredCerts: string[];
}): Promise<CompliancePartnerView[]> {
  try {
    const query = toQuery({
      categorySlug: params.categorySlug,
      requiredCerts: params.requiredCerts.join(","),
    });
    const res = await fetch(`/api/compliance-partners/recommended?${query}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Unable to load recommendations");
    const data = await res.json();
    return (data.items || []).map(toCompliancePartnerViewFromRecord);
  } catch (error) {
    const filtered = FALLBACK_VIEW.filter((partner) =>
      params.requiredCerts.every((cert) => partner.certifications.includes(cert as any))
    );
    return filtered;
  }
}

