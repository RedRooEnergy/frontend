import type { CompliancePartnerRecord, CompliancePartnerOffice, ComplianceCertification } from "./types";
import type { CompliancePartner } from "../../data/compliancePartners";

export type CompliancePartnerView = {
  id: string;
  name: string;
  certifications: ComplianceCertification[];
  slaDays: number;
  location: string;
  status: "Available" | "Limited" | "Busy";
  focusCategories?: string[];
  websiteUrl?: string;
  offices?: CompliancePartnerOffice[];
  brisbaneOffice?: boolean;
};

const BRISBANE = "brisbane";

function hasBrisbaneOffice(offices?: CompliancePartnerOffice[], location?: string) {
  if (offices && offices.some((office) => office.city.toLowerCase() === BRISBANE)) return true;
  if (location && location.toLowerCase().includes(BRISBANE)) return true;
  return false;
}

function buildLocationLabel(offices?: CompliancePartnerOffice[], fallback?: string) {
  if (offices && offices.length > 0) {
    const primary = offices.find((office) => office.isPrimary) || offices[0];
    if (primary) {
      const parts = [primary.city, primary.state].filter(Boolean);
      return `${parts.join(", ")}${primary.country ? `, ${primary.country}` : ""}`;
    }
  }
  return fallback || "—";
}

export function toCompliancePartnerViewFromRecord(record: CompliancePartnerRecord): CompliancePartnerView {
  const status: CompliancePartnerView["status"] =
    record.status === "ACTIVE" ? "Available" : record.status === "PENDING" ? "Limited" : "Busy";

  return {
    id: record.id,
    name: record.tradingName || record.legalName,
    certifications: record.scopes.certifications,
    slaDays: record.slaDays,
    location: buildLocationLabel(record.offices, record.jurisdiction),
    status,
    focusCategories: record.scopes.productCategories,
    websiteUrl: record.websiteUrl,
    offices: record.offices,
    brisbaneOffice: hasBrisbaneOffice(record.offices),
  };
}

export function toCompliancePartnerViewFromFallback(partner: CompliancePartner): CompliancePartnerView {
  return {
    id: partner.id,
    name: partner.name,
    certifications: partner.certifications as ComplianceCertification[],
    slaDays: partner.slaDays,
    location: partner.location,
    status: partner.status,
    focusCategories: partner.focusCategories,
    websiteUrl: partner.websiteUrl,
    offices: partner.offices as CompliancePartnerOffice[] | undefined,
    brisbaneOffice: hasBrisbaneOffice(partner.offices as CompliancePartnerOffice[] | undefined, partner.location),
  };
}

