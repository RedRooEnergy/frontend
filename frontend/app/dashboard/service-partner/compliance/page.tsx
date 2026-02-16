"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ServicePartnerDashboardLayout from "../../../../components/ServicePartnerDashboardLayout";
import {
  getSession,
  getServicePartnerComplianceProfile,
  ServicePartnerComplianceProfile,
  upsertServicePartnerComplianceProfile,
} from "../../../../lib/store";
import { REQUIRED_EVIDENCE_SLOTS } from "../../../../lib/servicePartnerComplianceValidation";

type StepId =
  | "identity"
  | "accreditation"
  | "capabilities"
  | "personnel"
  | "insurance"
  | "conflicts"
  | "security"
  | "declarations";

const steps: { id: StepId; title: string; helper: string }[] = [
  { id: "identity", title: "Company identity", helper: "Legal and operational anchors." },
  { id: "accreditation", title: "Authority & scope", helper: "Accreditation bodies, standards, scope." },
  { id: "capabilities", title: "Capabilities & methodology", helper: "Permitted actions and process." },
  { id: "personnel", title: "Personnel & licences", helper: "Named responsibility and licences." },
  { id: "insurance", title: "Insurance & indemnity", helper: "Coverage and expiry controls." },
  { id: "conflicts", title: "Independence & conflicts", helper: "Conflict declarations and disclosures." },
  { id: "security", title: "Digital & security", helper: "Data handling obligations." },
  { id: "declarations", title: "Legal declarations", helper: "Binding sign-off before submission." },
];

const certificationTypes = [
  { id: "product", label: "Product certification" },
  { id: "installation", label: "Installation inspection" },
  { id: "commissioning", label: "System commissioning" },
  { id: "shipment_inspection", label: "Shipment / customs compliance" },
  { id: "report_review", label: "Report review / validation" },
];

const INSTALLER_TERMS_HREF = "/documents/core-legal-consumer/installer-service-partner-terms";
const ACCREDITATION_EXPIRY_ERROR = "Accreditation expiry date must be today or later.";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isExpiredDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value < todayIsoDate();
}

function setDeepValue<T extends Record<string, any>>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const next: any = { ...obj };
  let cursor: any = next;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (i === keys.length - 1) {
      cursor[key] = value;
    } else {
      cursor[key] = { ...cursor[key] };
      cursor = cursor[key];
    }
  }
  return next;
}

function isFilled(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value);
  return String(value ?? "").trim().length > 0;
}

function validateStep(profile: ServicePartnerComplianceProfile, stepId: StepId) {
  const missing: string[] = [];
  const requireField = (path: string, label: string) => {
    const value = path.split(".").reduce<any>((acc, key) => (acc ? acc[key] : undefined), profile);
    if (!isFilled(value)) missing.push(label);
  };
  const requireEvidenceSlot = (prefix: string) => {
    for (const slot of REQUIRED_EVIDENCE_SLOTS) {
      if (!slot.path.startsWith(prefix)) continue;
      const value = slot.path.split(".").reduce<any>((acc, key) => (acc ? acc[key] : undefined), profile);
      if (!isFilled(value)) missing.push(`Required evidence slot (${slot.id})`);
    }
  };

  if (stepId === "identity") {
    requireField("identity.legalName", "Legal business name");
    requireField("identity.businessType", "Business type");
    requireField("identity.registrationNumber", "Registration number");
    requireField("identity.country", "Country of registration");
    requireField("identity.address", "Registered address");
    requireField("identity.contactName", "Primary contact name");
    requireField("identity.contactEmail", "Compliance email");
    requireField("identity.contactPhone", "Contact phone");
    requireField("identity.jurisdictions", "Operating jurisdictions");
  }

  if (stepId === "accreditation") {
    requireField("accreditation.body", "Accreditation body");
    requireField("accreditation.licenceNumber", "Accreditation/licence number");
    requireField("accreditation.certificationTypes", "Accreditation types");
    requireField("accreditation.standards", "Standards authorised");
    requireField("accreditation.issueDate", "Issue date");
    requireField("accreditation.expiryDate", "Expiry date");
    if (profile.accreditation.expiryDate && isExpiredDate(profile.accreditation.expiryDate)) {
      missing.push(ACCREDITATION_EXPIRY_ERROR);
    }
    requireEvidenceSlot("accreditation.");
  }

  if (stepId === "capabilities") {
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
      missing.push("At least one capability");
    }
    requireField("methodology.inspectionSummary", "Inspection methodology summary");
    requireField("methodology.issuanceWorkflow", "Certificate issuance workflow");
    requireField("methodology.retentionYears", "Record retention period");
  }

  if (stepId === "personnel") {
    requireField("personnel.responsibleOfficer", "Responsible officer");
    requireField("personnel.technicalLead", "Technical lead");
    requireField("personnel.inspectorCount", "Accredited inspectors count");
  }

  if (stepId === "insurance") {
    requireField("insurance.insurer", "Insurer");
    requireField("insurance.policyNumber", "Policy number");
    requireField("insurance.coverageAmount", "Coverage amount");
    requireField("insurance.expiryDate", "Policy expiry date");
    requireEvidenceSlot("insurance.");
  }

  if (stepId === "conflicts") {
    const decl = profile.conflicts.declarations;
    if (!decl.independentSuppliers) missing.push("Independence declaration");
    if (!decl.noFinancialInterest) missing.push("No financial interest declaration");
    if (!decl.noOwnershipLinks) missing.push("No ownership links declaration");
    if (!decl.acceptAuditAccess) missing.push("Audit access declaration");
    if (!decl.acknowledgePenalties) missing.push("False declaration penalties acknowledgement");
  }

  if (stepId === "security") {
    if (!profile.security.documentHandling) missing.push("Secure document handling");
    if (!profile.security.dataProtection) missing.push("Data protection & access control");
    if (!profile.security.breachProcess) missing.push("Breach notification process");
  }

  if (stepId === "declarations") {
    if (!profile.declarations.accuracyConfirmed) missing.push("Accuracy confirmation");
    if (!profile.declarations.agreementAccepted) missing.push("RRE agreement acceptance");
    if (!profile.declarations.auditAccessAccepted) missing.push("Audit access acceptance");
    if (profile.declarations.installerServicePartnerTermsAccepted !== true) {
      missing.push("Installer / Service Partner Terms acceptance");
    }
    requireField("declarations.signatoryName", "Authorised signatory name");
    requireField("declarations.signatoryTitle", "Signatory title");
    requireField("declarations.signatureDate", "Signature date");
    requireField("declarations.signature", "Digital signature");
  }

  return missing;
}

export default function ServicePartnerCompliancePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ServicePartnerComplianceProfile | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [changeRequestNote, setChangeRequestNote] = useState("");
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "service-partner") {
      router.replace("/signin?role=service-partner");
      return;
    }
    const loadProfile = async () => {
      try {
        const response = await fetch(`/api/service-partner/compliance/profile?partnerId=${session.userId}`, {
          credentials: "include",
        });
        if (response.ok) {
          const json = await response.json();
          if (json.profile) {
            setProfile(json.profile as ServicePartnerComplianceProfile);
            return;
          }
        }
      } catch (err) {
        // fall back to local
      }
      const stored = getServicePartnerComplianceProfile(session.userId);
      setProfile(stored);
    };
    loadProfile();
  }, [router]);

  const completionMap = useMemo(() => {
    if (!profile) return {};
    return steps.reduce<Record<string, boolean>>((acc, step) => {
      acc[step.id] = validateStep(profile, step.id).length === 0;
      return acc;
    }, {});
  }, [profile]);

  if (!profile) return null;

  const editableSteps =
    profile.status === "DRAFT"
      ? steps.map((step) => step.id)
      : profile.status === "CHANGES_REQUIRED"
      ? profile.unlockedSections ?? []
      : [];
  const currentStepId = steps[currentStep].id;
  const isStepEditable = editableSteps.includes(currentStepId);
  const isLocked = editableSteps.length === 0;

  const saveDraft = () => {
    upsertServicePartnerComplianceProfile(profile);
    setStatusMessage("Draft saved.");
    fetch("/api/service-partner/compliance/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(profile),
    }).catch(() => null);
  };

  const continueStep = () => {
    const stepId = steps[currentStep]?.id;
    const missing = validateStep(profile, stepId);
    if (missing.length > 0) {
      setStepErrors(missing);
      return;
    }
    setStepErrors([]);
    saveDraft();
    if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const submitForReview = async () => {
    const allMissing = steps.flatMap((step) => validateStep(profile, step.id));
    if (allMissing.length > 0) {
      setStepErrors(allMissing);
      return;
    }

    try {
      const response = await fetch("/api/service-partner/compliance/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profile),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStepErrors(payload?.errors ?? ["Submission failed validation."]);
        return;
      }
      const next = { ...profile, status: "SUBMITTED" as const };
      setProfile(next);
      upsertServicePartnerComplianceProfile(next);
      setStatusMessage("Submitted for review. Fields are locked pending admin decision.");
    } catch (err) {
      setStepErrors(["Submission failed. Please try again."]);
    }
  };

  const update = (path: string, value: unknown) => {
    if (profile.status !== "DRAFT" && profile.status !== "CHANGES_REQUIRED") return;
    setProfile((prev) => (prev ? setDeepValue(prev, path, value) : prev));
  };

  const updateTermsAcknowledgement = (checked: boolean) => {
    if (profile.status !== "DRAFT" && profile.status !== "CHANGES_REQUIRED") return;
    setProfile((prev) => {
      if (!prev) return prev;
      const next = setDeepValue(prev, "declarations.installerServicePartnerTermsAccepted", checked);
      return setDeepValue(
        next,
        "declarations.installerServicePartnerTermsAcceptedAt",
        checked ? new Date().toISOString() : ""
      );
    });
  };

  const toggleCertificationType = (id: string, checked: boolean) => {
    if (isLocked) return;
    const list = profile.accreditation.certificationTypes.slice();
    const exists = list.includes(id);
    let next = list;
    if (checked && !exists) next = [...list, id];
    if (!checked && exists) next = list.filter((item) => item !== id);
    update("accreditation.certificationTypes", next);
  };

  const requestChange = () => {
    if (!profile) return;
    const note = changeRequestNote.trim();
    if (!note) {
      setStatusMessage("Provide a change request note before submitting.");
      return;
    }
    const next = {
      ...profile,
      status: "CHANGES_REQUIRED" as const,
      changeRequestNote: note,
      changeRequestedAt: new Date().toISOString(),
      unlockedSections: profile.unlockedSections ?? [],
    };
    setProfile(next);
    upsertServicePartnerComplianceProfile(next);
    setStatusMessage("Change request submitted. Only flagged sections may be updated.");
  };

  const validatePdfFile = (file: File | null, maxMb: number, required = true) => {
    if (!file) return required ? "File is required." : "";
    const isPdfMime = file.type.toLowerCase() === "application/pdf";
    const isPdfExt = file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfMime || !isPdfExt) return "PDF files only.";
    if (file.size > maxMb * 1024 * 1024) return `File exceeds ${maxMb}MB limit.`;
    return "";
  };

  const uploadPdfFile = async (fieldKey: string, file: File) => {
    const presignResponse = await fetch("/api/service-partner/compliance/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        kind: fieldKey,
      }),
    });

    const presign = await presignResponse.json();
    if (!presignResponse.ok) {
      throw new Error(presign?.error || "Presign failed.");
    }

    const uploadResult = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: presign.headers || { "Content-Type": file.type || "application/pdf" },
      body: file,
    });

    if (!uploadResult.ok) {
      throw new Error("Upload failed.");
    }

    return presign.storageKey || file.name;
  };

  const handlePdfUpload = async (key: string, file: File | null, maxMb = 10, required = true) => {
    const error = validatePdfFile(file, maxMb, required);
    if (error) {
      setUploadErrors((prev) => ({ ...prev, [key]: error }));
      return;
    }
    setUploadErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (!file) {
      update(key, "");
      return;
    }
    try {
      const storageKey = await uploadPdfFile(key, file);
      update(key, storageKey);
    } catch (err: any) {
      setUploadErrors((prev) => ({ ...prev, [key]: err?.message || "Upload failed." }));
    }
  };

  const handlePdfUploadList = async (key: string, files: FileList | null, maxMb = 10) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) {
      setUploadErrors((prev) => ({ ...prev, [key]: "At least one PDF is required." }));
      return;
    }
    const invalid = list.find((file) => validatePdfFile(file, maxMb));
    const error = invalid ? validatePdfFile(invalid, maxMb) : "";
    if (error) {
      setUploadErrors((prev) => ({ ...prev, [key]: error }));
      return;
    }
    setUploadErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    try {
      const uploaded = [];
      for (const file of list) {
        // eslint-disable-next-line no-await-in-loop
        const storageKey = await uploadPdfFile(key, file);
        uploaded.push(storageKey);
      }
      update(key, uploaded);
    } catch (err: any) {
      setUploadErrors((prev) => ({ ...prev, [key]: err?.message || "Upload failed." }));
    }
  };

  const displayFile = (value: string) => {
    if (!value) return "";
    const parts = value.split("/");
    return parts[parts.length - 1] || value;
  };

  return (
    <ServicePartnerDashboardLayout title="Accreditation, Certification & Compliance">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Accreditation status</div>
            <p className="text-sm text-muted">Governance snapshot and expiry monitoring.</p>
          </div>
          <span className="buyer-pill">{profile.status.replace("_", " ")}</span>
        </div>
        <div className="buyer-form-grid">
          <div className="buyer-card">
            <div className="text-sm font-semibold">CEC Accreditation</div>
            <div className="text-xs text-muted">Status: Approved</div>
            <div className="text-xs text-muted">Expiry: 2026-12-31</div>
          </div>
          <div className="buyer-card">
            <div className="text-sm font-semibold">EESS / RCM Authority</div>
            <div className="text-xs text-muted">Status: Approved</div>
            <div className="text-xs text-muted">Expiry: 2027-05-30</div>
          </div>
          <div className="buyer-card">
            <div className="text-sm font-semibold">GEMS Authority</div>
            <div className="text-xs text-muted">Status: Pending renewal</div>
            <div className="text-xs text-muted">Expiry: 2025-09-15</div>
          </div>
        </div>
      </div>

      {profile.status === "SUBMITTED" && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div>
              <div className="buyer-section-title">Submitted — pending admin review</div>
              <p className="text-sm text-muted">
                Your onboarding profile is now locked while governance review is in progress.
              </p>
            </div>
            <span className="buyer-pill">Pending review</span>
          </div>
        </div>
      )}

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Onboarding progress</div>
            <p className="text-sm text-muted">Complete each step to unlock submission.</p>
          </div>
          <span className="text-xs text-muted">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
        <div className="grid md:grid-cols-4 gap-2">
          {steps.map((step, index) => {
            const completed = completionMap[step.id];
            const active = index === currentStep;
            return (
              <button
                key={step.id}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  active ? "border-brand-600 bg-brand-100" : "border-slate-200"
                }`}
                onClick={() => setCurrentStep(index)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{step.title}</span>
                  <span className={`text-xs ${completed ? "text-emerald-600" : "text-muted"}`}>
                    {completed ? "Complete" : "Pending"}
                  </span>
                </div>
                <div className="text-xs text-muted mt-1">{step.helper}</div>
              </button>
            );
          })}
        </div>
        {statusMessage && <p className="text-sm text-muted mt-3">{statusMessage}</p>}
        {stepErrors.length > 0 && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">Missing required items</div>
            <ul className="list-disc ml-4 mt-2">
              {stepErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>


      {(profile.status === "APPROVED" || profile.status === "ACTIVE") && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div>
              <div className="buyer-section-title">Request profile change</div>
              <p className="text-sm text-muted">
                Approved profiles are read-only. Submit a change request for admin review.
              </p>
            </div>
            <span className="buyer-pill">Governed</span>
          </div>
          <div className="buyer-form-grid">
            <div className="buyer-span-2">
              <label className="text-sm font-semibold">Change request summary</label>
              <textarea
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                rows={3}
                value={changeRequestNote}
                onChange={(event) => setChangeRequestNote(event.target.value)}
                placeholder="Describe the updates you need approved"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="px-4 py-2 rounded-md bg-brand-700 text-white text-sm font-semibold"
              onClick={requestChange}
            >
              Submit change request
            </button>
          </div>
        </div>
      )}

      {isLocked && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Read-only mode</div>
            <div className="text-xs text-muted">
              Profile fields are locked while awaiting admin decision.
            </div>
          </div>
        </div>
      )}

      {profile.status === "CHANGES_REQUIRED" && !isStepEditable && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Section locked</div>
            <div className="text-xs text-muted">
              This section is not unlocked for changes. Switch to an unlocked section or wait for admin updates.
            </div>
          </div>
        </div>
      )}

      <fieldset disabled={!isStepEditable} className="space-y-4">
      {currentStepId === "identity" && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Company identity</div>
            <div className="text-xs text-muted">Required for accreditation validation</div>
          </div>
          <div className="buyer-form-grid">
            <div>
              <label className="text-sm font-semibold">Legal business name</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.identity.legalName}
                onChange={(event) => update("identity.legalName", event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Trading name</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.identity.tradingName ?? ""}
                onChange={(event) => update("identity.tradingName", event.target.value)}
                placeholder="If different"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Business type</label>
              <select
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.identity.businessType}
                onChange={(event) => update("identity.businessType", event.target.value)}
              >
                <option value="">Select type</option>
                <option value="Accredited certification body">Accredited certification body</option>
                <option value="Government authority">Government authority</option>
                <option value="Private certifier">Private certifier</option>
                <option value="Testing laboratory">Testing laboratory</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">Registration number</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.identity.registrationNumber}
                onChange={(event) => update("identity.registrationNumber", event.target.value)}
                placeholder="ABN / ACN / equivalent"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Country of registration</label>
              <select
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.identity.country}
                onChange={(event) => update("identity.country", event.target.value)}
              >
                <option value="">Select country</option>
                <option value="AU">Australia</option>
                <option value="CN">China</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">Registered address</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.identity.address}
                onChange={(event) => update("identity.address", event.target.value)}
                placeholder="Street, city, region"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Primary contact name</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.identity.contactName}
                onChange={(event) => update("identity.contactName", event.target.value)}
                placeholder="Responsible officer"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Compliance inbox email</label>
              <input
                type="email"
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.identity.contactEmail}
                onChange={(event) => update("identity.contactEmail", event.target.value)}
                placeholder="compliance@yourdomain.com"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Contact phone</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.identity.contactPhone}
                onChange={(event) => update("identity.contactPhone", event.target.value)}
                placeholder="+61"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Operating jurisdictions</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.identity.jurisdictions}
                onChange={(event) => update("identity.jurisdictions", event.target.value)}
                placeholder="AU: QLD, NSW | CN: Guangdong"
              />
            </div>
          </div>
        </div>
      )}

      {currentStepId === "accreditation" && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Accreditation authority & scope</div>
            <div className="text-xs text-muted">Scope is enforced at job assignment.</div>
          </div>
          <div className="buyer-form-grid">
            <div>
              <label className="text-sm font-semibold">Accreditation body</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.accreditation.body}
                onChange={(event) => update("accreditation.body", event.target.value)}
                placeholder="CEC / EESS / State Regulator"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Accreditation / licence number</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.accreditation.licenceNumber}
                onChange={(event) => update("accreditation.licenceNumber", event.target.value)}
                placeholder="Licence or accreditation ID"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Accreditation type(s)</label>
              <div className="mt-2 space-y-2 text-sm text-muted">
                {certificationTypes.map((item) => (
                  <label key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profile.accreditation.certificationTypes.includes(item.id)}
                      onChange={(event) => toggleCertificationType(item.id, event.target.checked)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">Standards authorised</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.accreditation.standards}
                onChange={(event) => update("accreditation.standards", event.target.value)}
                placeholder="CEC, RCM, EESS, GEMS, AS/NZS"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Accreditation issue date</label>
              <input
                type="date"
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.accreditation.issueDate}
                onChange={(event) => update("accreditation.issueDate", event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Accreditation expiry date</label>
              <input
                type="date"
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.accreditation.expiryDate}
                onChange={(event) => update("accreditation.expiryDate", event.target.value)}
              />
            </div>
            <div className="buyer-span-2">
              <label className="text-sm font-semibold">Scope limitations</label>
              <textarea
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                rows={3}
                value={profile.accreditation.scopeLimitations}
                onChange={(event) => update("accreditation.scopeLimitations", event.target.value)}
                placeholder="List any exclusions or restricted activities"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Accreditation certificate (PDF)</label>
              <input
                type="file"
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                onChange={(event) =>
                  handlePdfUpload("accreditation.accreditationCertFile", event.target.files?.[0] ?? null, 10, true)
                }
              />
              {uploadErrors["accreditation.accreditationCertFile"] && (
                <div className="text-xs text-red-600 mt-1">
                  {uploadErrors["accreditation.accreditationCertFile"]}
                </div>
              )}
              {profile.accreditation.accreditationCertFile && (
                <div className="text-xs text-muted mt-1">
                  {displayFile(profile.accreditation.accreditationCertFile)}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold">Scope document (PDF)</label>
              <input
                type="file"
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                onChange={(event) =>
                  handlePdfUpload("accreditation.scopeDocFile", event.target.files?.[0] ?? null, 10, true)
                }
              />
              {uploadErrors["accreditation.scopeDocFile"] && (
                <div className="text-xs text-red-600 mt-1">{uploadErrors["accreditation.scopeDocFile"]}</div>
              )}
              {profile.accreditation.scopeDocFile && (
                <div className="text-xs text-muted mt-1">{displayFile(profile.accreditation.scopeDocFile)}</div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold">Regulator confirmation (optional)</label>
              <input
                type="file"
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                onChange={(event) =>
                  handlePdfUpload("accreditation.regulatorLetterFile", event.target.files?.[0] ?? null, 10, false)
                }
              />
              {uploadErrors["accreditation.regulatorLetterFile"] && (
                <div className="text-xs text-red-600 mt-1">{uploadErrors["accreditation.regulatorLetterFile"]}</div>
              )}
              {profile.accreditation.regulatorLetterFile && (
                <div className="text-xs text-muted mt-1">
                  {displayFile(profile.accreditation.regulatorLetterFile)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentStepId === "capabilities" && (
        <>
          <div className="buyer-card">
            <div className="buyer-card-header">
              <div className="buyer-section-title">Capabilities matrix</div>
              <div className="text-xs text-muted">Defines permitted actions.</div>
            </div>
            <div className="buyer-form-grid">
              <div className="buyer-span-2 space-y-2 text-sm text-muted">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.capabilities.canIssueCertificates}
                    onChange={(event) => update("capabilities.canIssueCertificates", event.target.checked)}
                  />
                  Issue compliance certificates
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.capabilities.canInspect}
                    onChange={(event) => update("capabilities.canInspect", event.target.checked)}
                  />
                  Perform physical inspections
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.capabilities.canReviewReports}
                    onChange={(event) => update("capabilities.canReviewReports", event.target.checked)}
                  />
                  Review third-party test reports
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.capabilities.canReject}
                    onChange={(event) => update("capabilities.canReject", event.target.checked)}
                  />
                  Reject products or installations
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.capabilities.canConditionalApprove}
                    onChange={(event) => update("capabilities.canConditionalApprove", event.target.checked)}
                  />
                  Issue conditional approvals
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.capabilities.canMandateRemediation}
                    onChange={(event) => update("capabilities.canMandateRemediation", event.target.checked)}
                  />
                  Mandate remediation actions
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.capabilities.remoteInspections}
                    onChange={(event) => update("capabilities.remoteInspections", event.target.checked)}
                  />
                  Remote inspections (where permitted)
                </label>
              </div>
              <div>
                <label className="text-sm font-semibold">Remote inspection methodology</label>
                <input
                  className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                  value={profile.capabilities.remoteMethodology}
                  onChange={(event) => update("capabilities.remoteMethodology", event.target.value)}
                  placeholder="Describe if remote inspections are enabled"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Typical turnaround (days)</label>
                <input
                  type="number"
                  className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                  value={profile.capabilities.turnaroundDays}
                  onChange={(event) => update("capabilities.turnaroundDays", event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="buyer-card">
            <div className="buyer-card-header">
              <div className="buyer-section-title">Process & methodology</div>
              <div className="text-xs text-muted">Regulator-auditable.</div>
            </div>
            <div className="buyer-form-grid">
              <div className="buyer-span-2">
                <label className="text-sm font-semibold">Inspection methodology summary</label>
                <textarea
                  className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                  rows={3}
                  value={profile.methodology.inspectionSummary}
                  onChange={(event) => update("methodology.inspectionSummary", event.target.value)}
                />
              </div>
              <div className="buyer-span-2">
                <label className="text-sm font-semibold">Certificate issuance workflow</label>
                <textarea
                  className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                  rows={3}
                  value={profile.methodology.issuanceWorkflow}
                  onChange={(event) => update("methodology.issuanceWorkflow", event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Record retention period (years)</label>
                <input
                  type="number"
                  className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                  value={profile.methodology.retentionYears}
                  onChange={(event) => update("methodology.retentionYears", event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Complaint handling procedure</label>
                <input
                  className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                  value={profile.methodology.complaintHandling}
                  onChange={(event) => update("methodology.complaintHandling", event.target.value)}
                  placeholder="Link or summary"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Process manual (PDF)</label>
                <input
                  type="file"
                  className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                  onChange={(event) =>
                    handlePdfUpload("methodology.processManualFile", event.target.files?.[0] ?? null, 10, false)
                  }
                />
                {uploadErrors["methodology.processManualFile"] && (
                  <div className="text-xs text-red-600 mt-1">{uploadErrors["methodology.processManualFile"]}</div>
                )}
                {profile.methodology.processManualFile && (
                  <div className="text-xs text-muted mt-1">{displayFile(profile.methodology.processManualFile)}</div>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold">Inspection checklist (PDF)</label>
                <input
                  type="file"
                  className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                  onChange={(event) =>
                    handlePdfUpload("methodology.checklistFile", event.target.files?.[0] ?? null, 10, false)
                  }
                />
                {uploadErrors["methodology.checklistFile"] && (
                  <div className="text-xs text-red-600 mt-1">{uploadErrors["methodology.checklistFile"]}</div>
                )}
                {profile.methodology.checklistFile && (
                  <div className="text-xs text-muted mt-1">{displayFile(profile.methodology.checklistFile)}</div>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold">Sample certificate (PDF)</label>
                <input
                  type="file"
                  className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                  onChange={(event) =>
                    handlePdfUpload("methodology.sampleCertificateFile", event.target.files?.[0] ?? null, 10, false)
                  }
                />
                {uploadErrors["methodology.sampleCertificateFile"] && (
                  <div className="text-xs text-red-600 mt-1">
                    {uploadErrors["methodology.sampleCertificateFile"]}
                  </div>
                )}
                {profile.methodology.sampleCertificateFile && (
                  <div className="text-xs text-muted mt-1">
                    {displayFile(profile.methodology.sampleCertificateFile)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {currentStepId === "personnel" && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Personnel & competency</div>
            <div className="text-xs text-muted">Licences are validated per assignment.</div>
          </div>
          <div className="buyer-form-grid">
            <div>
              <label className="text-sm font-semibold">Responsible officer</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.personnel.responsibleOfficer}
                onChange={(event) => update("personnel.responsibleOfficer", event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Technical lead</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.personnel.technicalLead}
                onChange={(event) => update("personnel.technicalLead", event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Accredited inspectors (count)</label>
              <input
                type="number"
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.personnel.inspectorCount}
                onChange={(event) => update("personnel.inspectorCount", event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Licence numbers</label>
              <textarea
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                rows={3}
                value={profile.personnel.licenceNumbers}
                onChange={(event) => update("personnel.licenceNumbers", event.target.value)}
                placeholder="One per line"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Licence expiry dates</label>
              <textarea
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                rows={3}
                value={profile.personnel.licenceExpiries}
                onChange={(event) => update("personnel.licenceExpiries", event.target.value)}
                placeholder="Include expiry date for each licence"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Personnel licences (PDF)</label>
              <input
                type="file"
                multiple
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                onChange={(event) => handlePdfUploadList("personnel.licenceFiles", event.target.files, 10)}
              />
              {uploadErrors["personnel.licenceFiles"] && (
                <div className="text-xs text-red-600 mt-1">{uploadErrors["personnel.licenceFiles"]}</div>
              )}
              {profile.personnel.licenceFiles.length > 0 && (
                <div className="text-xs text-muted mt-1">
                  {profile.personnel.licenceFiles.map(displayFile).join(", ")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentStepId === "insurance" && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Insurance & professional indemnity</div>
            <div className="text-xs text-muted">Required for activation.</div>
          </div>
          <div className="buyer-form-grid">
            <div>
              <label className="text-sm font-semibold">Insurer</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.insurance.insurer}
                onChange={(event) => update("insurance.insurer", event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Policy number</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.insurance.policyNumber}
                onChange={(event) => update("insurance.policyNumber", event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Coverage amount</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.insurance.coverageAmount}
                onChange={(event) => update("insurance.coverageAmount", event.target.value)}
                placeholder="AUD"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Policy expiry date</label>
              <input
                type="date"
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.insurance.expiryDate}
                onChange={(event) => update("insurance.expiryDate", event.target.value)}
              />
            </div>
            <div className="buyer-span-2">
              <label className="text-sm font-semibold">Certificate of currency (PDF)</label>
              <input
                type="file"
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                onChange={(event) =>
                  handlePdfUpload("insurance.certificateFile", event.target.files?.[0] ?? null, 10, true)
                }
              />
              {uploadErrors["insurance.certificateFile"] && (
                <div className="text-xs text-red-600 mt-1">{uploadErrors["insurance.certificateFile"]}</div>
              )}
              {profile.insurance.certificateFile && (
                <div className="text-xs text-muted mt-1">{displayFile(profile.insurance.certificateFile)}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentStepId === "conflicts" && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Independence & conflicts</div>
            <div className="text-xs text-muted">Required for credibility.</div>
          </div>
          <div className="buyer-form-grid">
            <div className="buyer-span-2 space-y-2 text-sm text-muted">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.conflicts.declarations.independentSuppliers}
                  onChange={(event) => update("conflicts.declarations.independentSuppliers", event.target.checked)}
                />
                Independent of suppliers whose products we certify
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.conflicts.declarations.noFinancialInterest}
                  onChange={(event) => update("conflicts.declarations.noFinancialInterest", event.target.checked)}
                />
                No financial interest in inspected installations
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.conflicts.declarations.noOwnershipLinks}
                  onChange={(event) => update("conflicts.declarations.noOwnershipLinks", event.target.checked)}
                />
                No ownership or control links with suppliers
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.conflicts.declarations.acceptAuditAccess}
                  onChange={(event) => update("conflicts.declarations.acceptAuditAccess", event.target.checked)}
                />
                Accept RRE audit and regulator access
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.conflicts.declarations.acknowledgePenalties}
                  onChange={(event) => update("conflicts.declarations.acknowledgePenalties", event.target.checked)}
                />
                Acknowledge false declaration penalties
              </label>
            </div>
            <div className="buyer-span-2">
              <label className="text-sm font-semibold">Conflict disclosure (if any)</label>
              <textarea
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                rows={3}
                value={profile.conflicts.conflictDisclosure}
                onChange={(event) => update("conflicts.conflictDisclosure", event.target.value)}
                placeholder="List any conflicts, ownership links, or related entities"
              />
            </div>
          </div>
        </div>
      )}

      {currentStepId === "security" && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Digital & security compliance</div>
            <div className="text-xs text-muted">Data handling obligations.</div>
          </div>
          <div className="buyer-form-grid">
            <div className="buyer-span-2 space-y-2 text-sm text-muted">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.security.documentHandling}
                  onChange={(event) => update("security.documentHandling", event.target.checked)}
                />
                Secure document handling procedures in place
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.security.dataProtection}
                  onChange={(event) => update("security.dataProtection", event.target.checked)}
                />
                Data protection and access control policies enforced
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.security.breachProcess}
                  onChange={(event) => update("security.breachProcess", event.target.checked)}
                />
                Breach notification process documented
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.security.iso27001}
                  onChange={(event) => update("security.iso27001", event.target.checked)}
                />
                ISO 27001 alignment (optional)
              </label>
            </div>
          </div>
        </div>
      )}

      {currentStepId === "declarations" && (
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Legal declarations & sign-off</div>
            <div className="text-xs text-muted">Submission is binding.</div>
          </div>
          <div className="buyer-form-grid">
            <div className="buyer-span-2 space-y-2 text-sm text-muted">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <a
                  href={INSTALLER_TERMS_HREF}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-brand-700 underline"
                >
                  Installer / Service Partner Terms
                </a>
                <p className="mt-1 text-xs text-muted">
                  Review the governing terms before acknowledging and submitting.
                </p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.declarations.accuracyConfirmed}
                  onChange={(event) => update("declarations.accuracyConfirmed", event.target.checked)}
                />
                I confirm the information provided is accurate and current.
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.declarations.agreementAccepted}
                  onChange={(event) => update("declarations.agreementAccepted", event.target.checked)}
                />
                I accept the RRE Compliance Partner Agreement.
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.declarations.auditAccessAccepted}
                  onChange={(event) => update("declarations.auditAccessAccepted", event.target.checked)}
                />
                I acknowledge audit access by RRE and regulators.
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.declarations.installerServicePartnerTermsAccepted === true}
                  onChange={(event) => updateTermsAcknowledgement(event.target.checked)}
                />
                I acknowledge and accept the Installer / Service Partner Terms.
              </label>
              {profile.declarations.installerServicePartnerTermsAcceptedAt ? (
                <div className="text-xs text-muted">
                  Terms acknowledged at {profile.declarations.installerServicePartnerTermsAcceptedAt}.
                </div>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-semibold">Authorised signatory name</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.declarations.signatoryName}
                onChange={(event) => update("declarations.signatoryName", event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Title / position</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.declarations.signatoryTitle}
                onChange={(event) => update("declarations.signatoryTitle", event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Signature date</label>
              <input
                type="date"
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.declarations.signatureDate}
                onChange={(event) => update("declarations.signatureDate", event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Digital signature</label>
              <input
                className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
                value={profile.declarations.signature}
                onChange={(event) => update("declarations.signature", event.target.value)}
                placeholder="Type full legal name"
              />
            </div>
          </div>
        </div>
      )}

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Save & continue</div>
            <p className="text-sm text-muted">Save draft progress before moving to the next step.</p>
          </div>
          <span className="buyer-pill">Governed</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
            onClick={saveDraft}
            disabled={!isStepEditable}
          >
            Save draft
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              className="px-4 py-2 rounded-md bg-brand-700 text-white font-semibold"
              onClick={continueStep}
              disabled={!isStepEditable}
            >
              Save & continue
            </button>
          ) : (
            <button
              className="px-4 py-2 rounded-md bg-brand-700 text-white font-semibold"
              onClick={submitForReview}
              disabled={!isStepEditable}
            >
              Submit for review
            </button>
          )}
        </div>
      </div>
      </fieldset>
    </ServicePartnerDashboardLayout>
  );
}
