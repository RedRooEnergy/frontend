"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../../components/AdminDashboardLayout";
import {
  getSession,
  ServicePartnerComplianceProfile,
} from "../../../../../lib/store";
import { formatDate } from "../../../../../lib/utils";
import { getAdminAuthHeaders } from "../../../../../lib/auth/clientAdminHeaders";

const statusOptions: ServicePartnerComplianceProfile["status"][] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUIRED",
  "APPROVED",
  "ACTIVE",
  "RESTRICTED",
  "SUSPENDED",
  "REVOKED",
  "EXPIRED",
];

const stepLabels: { id: string; label: string }[] = [
  { id: "identity", label: "Company identity" },
  { id: "accreditation", label: "Authority & scope" },
  { id: "capabilities", label: "Capabilities & methodology" },
  { id: "personnel", label: "Personnel & licences" },
  { id: "insurance", label: "Insurance & indemnity" },
  { id: "conflicts", label: "Independence & conflicts" },
  { id: "security", label: "Digital & security" },
  { id: "declarations", label: "Legal declarations" },
];

const reasonCodes = [
  "APPROVE_COMPLIANT",
  "APPROVE_WITH_MONITORING",
  "CHANGES_REQUIRED_SCOPE",
  "CHANGES_REQUIRED_INSURANCE",
  "CHANGES_REQUIRED_PERSONNEL",
  "CHANGES_REQUIRED_CONFLICTS",
  "REJECT_INCOMPLETE",
  "REJECT_SCOPE_MISMATCH",
  "SUSPEND_EXPIRY",
  "SUSPEND_NON_COMPLIANCE",
];

export default function AdminServicePartnerReviewPage() {
  const router = useRouter();
  const params = useParams();
  const partnerId = String(params?.partnerId ?? "");
  const session = getSession();

  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);

  const [profile, setProfile] = useState<ServicePartnerComplianceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ServicePartnerComplianceProfile["status"]>("SUBMITTED");
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [checklist, setChecklist] = useState({
    identityVerified: false,
    accreditationVerified: false,
    insuranceVerified: false,
    conflictsReviewed: false,
    methodologyReviewed: false,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [evidenceStatus, setEvidenceStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/service-partners/${partnerId}`, {
          credentials: "include",
          headers: getAdminAuthHeaders(),
        });
        if (!response.ok) {
          setProfile(null);
          return;
        }
        const json = await response.json();
        const match = json.profile as ServicePartnerComplianceProfile | null;
        setProfile(match);
        if (match) {
          setStatus(match.status);
          setUnlocked(match.unlockedSections ?? []);
          setNote(match.changeRequestNote ?? "");
          setReviewerNotes(match.adminReviewNotes ?? "");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const displayName = useMemo(() => profile?.identity.legalName || "Compliance partner", [profile]);

  if (loading) {
    return (
      <AdminDashboardLayout title="Service Partner Review">
        <div className="buyer-card">
          <div className="buyer-section-title">Loading profile…</div>
          <p className="text-sm text-muted">Retrieving compliance submission.</p>
        </div>
      </AdminDashboardLayout>
    );
  }

  if (!profile) {
    return (
      <AdminDashboardLayout title="Service Partner Review">
        <div className="buyer-card">
          <div className="buyer-section-title">Partner not found</div>
          <p className="text-sm text-muted">This compliance profile does not exist.</p>
        </div>
      </AdminDashboardLayout>
    );
  }

  const toggleUnlock = (id: string, enabled: boolean) => {
    setUnlocked((prev) =>
      enabled ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((item) => item !== id)
    );
  };

  const applyDecision = async () => {
    const nextErrors: string[] = [];
    if (!reasonCode) nextErrors.push("Reason code is required.");
    const checklistPassed = Object.values(checklist).every(Boolean);
    if (!checklistPassed) nextErrors.push("All review checklist items must be confirmed.");
    if (status === "CHANGES_REQUIRED" && unlocked.length === 0) {
      nextErrors.push("Select at least one section to unlock for changes.");
    }
    if (status === "CHANGES_REQUIRED" && !note.trim()) {
      nextErrors.push("Provide a change request note.");
    }
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors([]);
    const response = await fetch("/api/admin/service-partners/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
      credentials: "include",
      body: JSON.stringify({
        partnerId: profile.partnerId,
        status,
        reasonCode,
        notes: note,
        reviewerNotes,
        unlockedSections: status === "CHANGES_REQUIRED" ? unlocked : [],
        checklist,
        actorId: session?.userId || "admin",
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      setErrors([json?.error || "Decision failed."]);
      return;
    }
    setProfile(json.profile);
  };

  const openEvidence = async (storageKey: string) => {
    if (!storageKey) return;
    setEvidenceStatus("Preparing download…");
    try {
      const response = await fetch(`/api/service-partner/compliance/download?key=${encodeURIComponent(storageKey)}`, {
        credentials: "include",
      });
      const json = await response.json();
      if (!response.ok) {
        setEvidenceStatus(json?.error || "Unable to fetch download link.");
        return;
      }
      window.open(json.url, "_blank", "noopener");
      setEvidenceStatus(null);
    } catch {
      setEvidenceStatus("Unable to fetch download link.");
    }
  };

  return (
    <AdminDashboardLayout title="Service Partner Compliance Review">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">{displayName}</div>
            <p className="text-sm text-muted">Partner ID: {profile.partnerId}</p>
          </div>
          <span className="buyer-pill">{profile.status.replace(/_/g, " ")}</span>
        </div>
        <div className="buyer-form-grid">
          <div>
            <div className="text-xs text-muted">Contact</div>
            <div className="text-sm font-semibold">{profile.identity.contactEmail || "—"}</div>
            <div className="text-xs text-muted">{profile.identity.contactPhone || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Jurisdictions</div>
            <div className="text-sm font-semibold">{profile.identity.jurisdictions || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Last updated</div>
            <div className="text-sm font-semibold">{formatDate(profile.updatedAt)}</div>
          </div>
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Grand-Master decision</div>
            <p className="text-sm text-muted">Set status and unlock sections where changes are required.</p>
          </div>
          <span className="buyer-pill">Governed</span>
        </div>
        <div className="buyer-form-grid">
          <div>
            <label className="text-sm font-semibold">Decision status</label>
            <select
              className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
              value={status}
              onChange={(event) => setStatus(event.target.value as ServicePartnerComplianceProfile["status"])}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Reason code</label>
            <select
              className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
            >
              <option value="">Select reason code</option>
              {reasonCodes.map((code) => (
                <option key={code} value={code}>
                  {code.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Change request note</label>
            <textarea
              className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Required for CHANGES REQUIRED"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Reviewer notes</label>
            <textarea
              className="w-full mt-1 rounded-md border border-slate-200 px-3 py-2"
              rows={3}
              value={reviewerNotes}
              onChange={(event) => setReviewerNotes(event.target.value)}
              placeholder="Internal admin notes"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold">Review checklist</div>
          <div className="mt-2 grid md:grid-cols-2 gap-2 text-sm text-muted">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checklist.identityVerified}
                onChange={(event) => setChecklist((prev) => ({ ...prev, identityVerified: event.target.checked }))}
              />
              Identity verified
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checklist.accreditationVerified}
                onChange={(event) => setChecklist((prev) => ({ ...prev, accreditationVerified: event.target.checked }))}
              />
              Accreditation evidence verified
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checklist.insuranceVerified}
                onChange={(event) => setChecklist((prev) => ({ ...prev, insuranceVerified: event.target.checked }))}
              />
              Insurance verified
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checklist.conflictsReviewed}
                onChange={(event) => setChecklist((prev) => ({ ...prev, conflictsReviewed: event.target.checked }))}
              />
              Conflicts reviewed
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checklist.methodologyReviewed}
                onChange={(event) => setChecklist((prev) => ({ ...prev, methodologyReviewed: event.target.checked }))}
              />
              Methodology reviewed
            </label>
          </div>
        </div>

        {status === "CHANGES_REQUIRED" && (
          <div className="mt-4">
            <div className="text-sm font-semibold">Unlock sections</div>
            <div className="mt-2 grid md:grid-cols-2 gap-2 text-sm text-muted">
              {stepLabels.map((step) => (
                <label key={step.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={unlocked.includes(step.id)}
                    onChange={(event) => toggleUnlock(step.id, event.target.checked)}
                  />
                  {step.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">Action required</div>
            <ul className="list-disc ml-4 mt-2">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <button className="px-4 py-2 rounded-md bg-brand-700 text-white font-semibold" onClick={applyDecision}>
            Apply decision
          </button>
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Evidence viewer</div>
            <p className="text-sm text-muted">Open submitted evidence files in a new tab.</p>
          </div>
        </div>
        <div className="buyer-form-grid">
          {[
            { label: "Accreditation certificate", keys: [profile.accreditation.accreditationCertFile] },
            { label: "Scope document", keys: [profile.accreditation.scopeDocFile] },
            { label: "Regulator confirmation", keys: [profile.accreditation.regulatorLetterFile] },
            { label: "Personnel licences", keys: profile.personnel.licenceFiles },
            { label: "Process manual", keys: [profile.methodology.processManualFile] },
            { label: "Inspection checklist", keys: [profile.methodology.checklistFile] },
            { label: "Sample certificate", keys: [profile.methodology.sampleCertificateFile] },
            { label: "Insurance certificate", keys: [profile.insurance.certificateFile] },
          ].map((item) => {
            const hasFiles = item.keys.some((key) => key);
            return (
              <div key={item.label} className="buyer-card">
                <div className="text-sm font-semibold">{item.label}</div>
                {hasFiles ? (
                  <div className="mt-2 space-y-2">
                    {item.keys.filter(Boolean).map((key) => (
                      <button
                        key={key}
                        className="px-3 py-2 rounded-md border border-slate-200 text-xs font-semibold text-left w-full"
                        onClick={() => openEvidence(key)}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted mt-2">Not provided</div>
                )}
              </div>
            );
          })}
        </div>
        {evidenceStatus && <p className="text-sm text-amber-700 mt-3">{evidenceStatus}</p>}
      </div>
    </AdminDashboardLayout>
  );
}
