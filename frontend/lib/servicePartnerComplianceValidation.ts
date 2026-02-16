import { ServicePartnerComplianceProfile } from "./store";

const ACCREDITATION_EXPIRY_ERROR = "Accreditation expiry date must be today or later.";

export const REQUIRED_EVIDENCE_SLOTS = [
  {
    id: "accreditation_certificate_pdf",
    label: "Accreditation certificate",
    path: "accreditation.accreditationCertFile",
  },
  {
    id: "accreditation_scope_pdf",
    label: "Scope document",
    path: "accreditation.scopeDocFile",
  },
  {
    id: "insurance_certificate_pdf",
    label: "Certificate of currency",
    path: "insurance.certificateFile",
  },
] as const;

function getPathValue(profile: ServicePartnerComplianceProfile, path: string) {
  return path.split(".").reduce<any>((acc, key) => (acc ? acc[key] : undefined), profile);
}

function isFilled(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value);
  return String(value ?? "").trim().length > 0;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isExpiredDate(value: unknown) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) && trimmed < todayIsoDate();
}

export function validateComplianceProfile(profile: ServicePartnerComplianceProfile) {
  const errors: string[] = [];
  const requireField = (value: unknown, label: string) => {
    if (!isFilled(value)) errors.push(label);
  };

  requireField(profile.identity.legalName, "Legal business name");
  requireField(profile.identity.businessType, "Business type");
  requireField(profile.identity.registrationNumber, "Registration number");
  requireField(profile.identity.country, "Country of registration");
  requireField(profile.identity.address, "Registered address");
  requireField(profile.identity.contactName, "Primary contact name");
  requireField(profile.identity.contactEmail, "Compliance email");
  requireField(profile.identity.contactPhone, "Contact phone");
  requireField(profile.identity.jurisdictions, "Operating jurisdictions");

  requireField(profile.accreditation.body, "Accreditation body");
  requireField(profile.accreditation.licenceNumber, "Accreditation/licence number");
  requireField(profile.accreditation.certificationTypes, "Accreditation types");
  requireField(profile.accreditation.standards, "Standards authorised");
  requireField(profile.accreditation.issueDate, "Accreditation issue date");
  requireField(profile.accreditation.expiryDate, "Accreditation expiry date");
  if (isExpiredDate(profile.accreditation.expiryDate)) errors.push(ACCREDITATION_EXPIRY_ERROR);

  const caps = profile.capabilities;
  if (
    !caps.canIssueCertificates &&
    !caps.canInspect &&
    !caps.canReviewReports &&
    !caps.canReject &&
    !caps.canConditionalApprove &&
    !caps.canMandateRemediation &&
    !caps.remoteInspections
  ) {
    errors.push("At least one capability");
  }

  requireField(profile.methodology.inspectionSummary, "Inspection methodology summary");
  requireField(profile.methodology.issuanceWorkflow, "Certificate issuance workflow");
  requireField(profile.methodology.retentionYears, "Record retention period");

  requireField(profile.personnel.responsibleOfficer, "Responsible officer");
  requireField(profile.personnel.technicalLead, "Technical lead");
  requireField(profile.personnel.inspectorCount, "Accredited inspectors count");

  requireField(profile.insurance.insurer, "Insurer");
  requireField(profile.insurance.policyNumber, "Policy number");
  requireField(profile.insurance.coverageAmount, "Coverage amount");
  requireField(profile.insurance.expiryDate, "Policy expiry date");

  for (const slot of REQUIRED_EVIDENCE_SLOTS) {
    requireField(getPathValue(profile, slot.path), `Required evidence slot (${slot.id})`);
  }

  if (!profile.conflicts.declarations.independentSuppliers) errors.push("Independence declaration");
  if (!profile.conflicts.declarations.noFinancialInterest) errors.push("No financial interest declaration");
  if (!profile.conflicts.declarations.noOwnershipLinks) errors.push("No ownership links declaration");
  if (!profile.conflicts.declarations.acceptAuditAccess) errors.push("Audit access declaration");
  if (!profile.conflicts.declarations.acknowledgePenalties) errors.push("False declaration penalties acknowledgement");

  if (!profile.security.documentHandling) errors.push("Secure document handling");
  if (!profile.security.dataProtection) errors.push("Data protection & access control");
  if (!profile.security.breachProcess) errors.push("Breach notification process");

  if (!profile.declarations.accuracyConfirmed) errors.push("Accuracy confirmation");
  if (!profile.declarations.agreementAccepted) errors.push("RRE agreement acceptance");
  if (!profile.declarations.auditAccessAccepted) errors.push("Audit access acceptance");
  if (profile.declarations.installerServicePartnerTermsAccepted !== true) {
    errors.push("Installer / Service Partner Terms acceptance");
  }
  requireField(profile.declarations.signatoryName, "Authorised signatory name");
  requireField(profile.declarations.signatoryTitle, "Signatory title");
  requireField(profile.declarations.signatureDate, "Signature date");
  requireField(profile.declarations.signature, "Digital signature");

  return errors;
}
