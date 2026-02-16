import type { ServicePartnerComplianceProfile } from "../store";

type SeedInput = {
  partnerId: string;
  legalName: string;
  tradingName?: string;
  jurisdictions: string;
  certificationTypes: string[];
};

const now = () => new Date().toISOString();

function buildSeedProfile(seed: SeedInput): ServicePartnerComplianceProfile {
  return {
    partnerId: seed.partnerId,
    status: "APPROVED",
    updatedAt: now(),
    changeRequestNote: "",
    changeRequestedAt: "",
    unlockedSections: [],
    adminReviewNotes: "Dev seed profile (no Mongo configured).",
    identity: {
      legalName: seed.legalName,
      tradingName: seed.tradingName || "",
      businessType: "Compliance Agency",
      registrationNumber: "N/A",
      country: "AU",
      address: "Australia",
      contactName: "Compliance Desk",
      contactEmail: "compliance@redrooenergy.local",
      contactPhone: "+61 000 000 000",
      jurisdictions: seed.jurisdictions,
    },
    accreditation: {
      body: "EESS / RECS",
      licenceNumber: `REF-${seed.partnerId.toUpperCase()}`,
      certificationTypes: seed.certificationTypes,
      standards: "AS/NZS 3000, AS/NZS 4777, AS/NZS 5139",
      issueDate: now(),
      expiryDate: "",
      scopeLimitations: "",
      accreditationCertFile: "",
      scopeDocFile: "",
      regulatorLetterFile: "",
    },
    capabilities: {
      canIssueCertificates: true,
      canInspect: true,
      canReviewReports: true,
      canReject: true,
      canConditionalApprove: true,
      canMandateRemediation: true,
      remoteInspections: true,
      remoteMethodology: "Video + document review",
      turnaroundDays: "7-14",
    },
    personnel: {
      responsibleOfficer: "Compliance Officer",
      technicalLead: "Technical Lead",
      inspectorCount: "10+",
      licenceNumbers: "",
      licenceExpiries: "",
      licenceFiles: [],
    },
    conflicts: {
      declarations: {
        independentSuppliers: true,
        noFinancialInterest: true,
        noOwnershipLinks: true,
        acceptAuditAccess: true,
        acknowledgePenalties: true,
      },
      conflictDisclosure: "None declared.",
    },
    methodology: {
      inspectionSummary: "Document review + standards verification.",
      issuanceWorkflow: "Independent certification workflow.",
      retentionYears: "7",
      complaintHandling: "Formal dispute escalation.",
      processManualFile: "",
      checklistFile: "",
      sampleCertificateFile: "",
    },
    insurance: {
      insurer: "",
      policyNumber: "",
      coverageAmount: "",
      expiryDate: "",
      certificateFile: "",
    },
    security: {
      documentHandling: true,
      dataProtection: true,
      breachProcess: true,
      iso27001: false,
    },
    declarations: {
      accuracyConfirmed: true,
      agreementAccepted: true,
      auditAccessAccepted: true,
      signatoryName: "Compliance Officer",
      signatoryTitle: "Director",
      signatureDate: now(),
      signature: "seed",
    },
  };
}

export function getDevServicePartnerProfiles(): ServicePartnerComplianceProfile[] {
  return [
    buildSeedProfile({
      partnerId: "sp-cba",
      legalName: "Certification Body Australia (CBA)",
      jurisdictions: "AU",
      certificationTypes: ["EESS", "RCM", "GEMS"],
    }),
    buildSeedProfile({
      partnerId: "sp-eess-ccs",
      legalName: "EESS Conformity Certification Services (CCS)",
      jurisdictions: "AU",
      certificationTypes: ["EESS", "RCM", "GEMS"],
    }),
    buildSeedProfile({
      partnerId: "sp-global-mark",
      legalName: "Global-Mark Pty Ltd",
      jurisdictions: "AU",
      certificationTypes: ["EESS", "RCM", "GEMS"],
    }),
    buildSeedProfile({
      partnerId: "sp-ul-nz",
      legalName: "UL International New Zealand Limited",
      jurisdictions: "NZ/AU",
      certificationTypes: ["EESS", "RCM"],
    }),
    buildSeedProfile({
      partnerId: "sp-saa-approvals",
      legalName: "SAA Approvals Pty Ltd",
      jurisdictions: "AU",
      certificationTypes: ["EESS", "RCM"],
    }),
    buildSeedProfile({
      partnerId: "sp-oz-cert",
      legalName: "Oz Cert Pty Ltd (Oz Cert)",
      jurisdictions: "AU",
      certificationTypes: ["EESS", "RCM", "GEMS"],
    }),
    buildSeedProfile({
      partnerId: "sp-sgs-au",
      legalName: "SGS Australia Pty Ltd",
      jurisdictions: "AU",
      certificationTypes: ["CEC", "EESS", "RCM"],
    }),
    buildSeedProfile({
      partnerId: "sp-tuv-au",
      legalName: "TUV Rheinland Australia Pty Ltd",
      jurisdictions: "AU",
      certificationTypes: ["CEC", "EESS", "RCM"],
    }),
  ];
}
