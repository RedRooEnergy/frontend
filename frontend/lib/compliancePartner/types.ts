export type ComplianceJurisdiction = "AU" | "NZ" | "AU_NZ";
export type ComplianceCountry = "AU" | "NZ";
export type CompliancePartnerStatus = "ACTIVE" | "SUSPENDED" | "REVOKED" | "PENDING";
export type ComplianceCertification =
  | "CEC"
  | "EESS"
  | "RCM"
  | "GEMS"
  | "STRUCTURAL"
  | "IEC"
  | "AS_NZS"
  | "ISO";

export type CompliancePartnerScope = {
  certifications: ComplianceCertification[];
  productCategories: string[];
  productSubCategories?: string[];
};

export type CompliancePartnerCapabilities = {
  issuesCertificates: boolean;
  testingLabAccess: boolean;
  supportsRemoteReview: boolean;
  supportsOnsiteInspection: boolean;
};

export type CompliancePartnerApiIntegration = {
  mode: "API" | "PORTAL" | "EMAIL";
  callbackUrl?: string;
  statusEndpoint?: string;
};

export type CompliancePartnerOffice = {
  city: string;
  state?: string;
  country: ComplianceCountry;
  label?: string;
  addressLine?: string;
  postcode?: string;
  sourceUrl?: string;
  isPrimary?: boolean;
  isNearestToBrisbane?: boolean;
};

export type CompliancePartnerContact = {
  name?: string;
  email?: string;
  phone?: string;
};

export type CompliancePartnerEvidence = {
  accreditationDocs: string[];
  scopeDocs: string[];
};

export type CompliancePartnerAuditMeta = {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  locked: boolean;
  lockedAt?: string;
  lockedBy?: string;
};

export type CompliancePartnerRecord = {
  id: string;
  legalName: string;
  tradingName?: string;
  jurisdiction: ComplianceJurisdiction;
  country: ComplianceCountry;
  websiteUrl: string;
  offices?: CompliancePartnerOffice[];
  status: CompliancePartnerStatus;
  scopes: CompliancePartnerScope;
  capabilities: CompliancePartnerCapabilities;
  slaDays: number;
  contact: CompliancePartnerContact;
  apiIntegration: CompliancePartnerApiIntegration;
  evidence: CompliancePartnerEvidence;
  audit: CompliancePartnerAuditMeta;
};

export type CompliancePartnerStatusLog = {
  partnerId: string;
  previousStatus: CompliancePartnerStatus;
  newStatus: CompliancePartnerStatus;
  reasonCode?: string;
  notes?: string;
  actorId: string;
  createdAt: string;
};
