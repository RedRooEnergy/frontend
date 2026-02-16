export type ComplianceMarket = "AU" | "NZ" | "GLOBAL";
export type ComplianceProductType = "InverterBatteryEV" | "SolarElectrical" | "ISO";
export type ComplianceStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED";
export type ComplianceRcmReadiness = "NOT_READY" | "READY_TO_LIST";

export type ComplianceDocumentType =
  | "TEST_REPORT"
  | "BOM"
  | "SCHEMATICS"
  | "MANUAL_EN"
  | "MANUAL_AU"
  | "LABEL_RCM"
  | "MECH_DRAWINGS"
  | "ISO_SCOPE"
  | "ISO_PROCESS_MAPS"
  | "ISO_MANUALS"
  | "ISO_INTERNAL_AUDIT"
  | "ISO_MGMT_REVIEW"
  | "OTHER";

export type ChecklistItem = {
  itemId: string;
  label: string;
  required: boolean;
  docTypes: ComplianceDocumentType[];
};

export type ChecklistDefinition = {
  checklistId: string;
  productType: ComplianceProductType;
  title: string;
  status: "DRAFT" | "LOCKED" | "ACTIVE" | "RETIRED";
  version: string;
  effectiveFrom: string;
  items: ChecklistItem[];
};

export type ChecklistEvaluationResult = {
  itemId: string;
  required: boolean;
  status: "PASS" | "FAIL" | "N_A";
  missingDocTypes: ComplianceDocumentType[];
};

export type ChecklistEvaluation = {
  applicationId: string;
  checklistId: string;
  version: string;
  results: ChecklistEvaluationResult[];
  overallStatus: "PASS" | "FAIL";
};

export type ComplianceChecklistRef = {
  checklistId: string;
  version: string;
};

export type ComplianceApplication = {
  id: string;
  supplierId: string;
  productId?: string;
  productType: ComplianceProductType;
  markets: ComplianceMarket[];
  status: ComplianceStatus;
  rcmReadiness: ComplianceRcmReadiness;
  checklistRef?: ComplianceChecklistRef;
  createdAt: string;
  updatedAt: string;
};

export type ComplianceDocument = {
  id: string;
  applicationId: string;
  documentType: ComplianceDocumentType;
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256Hash: string;
  storageKey: string;
  uploadedAt: string;
};

export type ComplianceReviewDecision = {
  applicationId: string;
  decision: "APPROVE" | "REJECT" | "REQUEST_CHANGES";
  reasons: string[];
  notes?: string;
  decidedAt: string;
  actor?: { id: string; role: "admin" };
};

export type ComplianceEvidenceExport = {
  exportId: string;
  applicationId: string;
  manifestSha256: string;
  jsonPath: string;
  pdfPath?: string;
  createdAt: string;
};

export type ComplianceStore = {
  applications: ComplianceApplication[];
  documents: ComplianceDocument[];
  decisions: ComplianceReviewDecision[];
  exports: ComplianceEvidenceExport[];
};

