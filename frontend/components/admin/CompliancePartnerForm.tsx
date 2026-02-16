"use client";

import { useMemo, useState } from "react";
import type { CompliancePartnerRecord } from "../../lib/compliancePartner/types";

type Props = {
  initial?: CompliancePartnerRecord;
  onSubmit: (payload: CompliancePartnerRecord) => Promise<void>;
  submitLabel: string;
  disableId?: boolean;
};

const STATUS_OPTIONS = ["ACTIVE", "PENDING", "SUSPENDED", "REVOKED"] as const;
const JURISDICTION_OPTIONS = ["AU", "NZ", "AU_NZ"] as const;
const COUNTRY_OPTIONS = ["AU", "NZ"] as const;

function formatJson(value: any) {
  return JSON.stringify(value ?? {}, null, 2);
}

export default function CompliancePartnerForm({ initial, onSubmit, submitLabel, disableId }: Props) {
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(() => ({
    id: initial?.id || "",
    legalName: initial?.legalName || "",
    tradingName: initial?.tradingName || "",
    websiteUrl: initial?.websiteUrl || "",
    jurisdiction: initial?.jurisdiction || "AU",
    country: initial?.country || "AU",
    status: initial?.status || "ACTIVE",
    slaDays: String(initial?.slaDays ?? 8),
    certificationsText: (initial?.scopes?.certifications || []).join(", "),
    categoriesText: (initial?.scopes?.productCategories || []).join(", "),
    subCategoriesText: (initial?.scopes?.productSubCategories || []).join(", "),
    contactName: initial?.contact?.name || "",
    contactEmail: initial?.contact?.email || "",
    contactPhone: initial?.contact?.phone || "",
    capabilitiesJson: formatJson(
      initial?.capabilities || {
        issuesCertificates: true,
        testingLabAccess: false,
        supportsRemoteReview: true,
        supportsOnsiteInspection: false,
      }
    ),
    apiIntegrationJson: formatJson(
      initial?.apiIntegration || {
        mode: "PORTAL",
      }
    ),
    evidenceJson: formatJson(
      initial?.evidence || {
        accreditationDocs: [],
        scopeDocs: [],
      }
    ),
    officesJson: formatJson(initial?.offices || []),
  }));

  const parsedScopes = useMemo(() => {
    return {
      certifications: form.certificationsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      productCategories: form.categoriesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      productSubCategories: form.subCategoriesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }, [form.certificationsText, form.categoriesText, form.subCategoriesText]);

  const handleSubmit = async () => {
    setError("");
    try {
      const capabilities = JSON.parse(form.capabilitiesJson || "{}");
      const apiIntegration = JSON.parse(form.apiIntegrationJson || "{}");
      const evidence = JSON.parse(form.evidenceJson || "{}");
      const offices = JSON.parse(form.officesJson || "[]");

      const payload: CompliancePartnerRecord = {
        id: form.id.trim(),
        legalName: form.legalName.trim(),
        tradingName: form.tradingName.trim(),
        jurisdiction: form.jurisdiction as CompliancePartnerRecord["jurisdiction"],
        country: form.country as CompliancePartnerRecord["country"],
        websiteUrl: form.websiteUrl.trim(),
        status: form.status as CompliancePartnerRecord["status"],
        slaDays: Number(form.slaDays || 0),
        contact: {
          name: form.contactName.trim(),
          email: form.contactEmail.trim(),
          phone: form.contactPhone.trim(),
        },
        scopes: {
          certifications: parsedScopes.certifications as CompliancePartnerRecord["scopes"]["certifications"],
          productCategories: parsedScopes.productCategories,
          productSubCategories: parsedScopes.productSubCategories,
        },
        capabilities,
        apiIntegration,
        evidence,
        offices,
        audit: initial?.audit || {
          createdAt: "",
          createdBy: "",
          updatedAt: "",
          updatedBy: "",
          locked: false,
        },
      };

      if (!payload.id || !payload.legalName) {
        throw new Error("Partner ID and legal name are required.");
      }

      setSaving(true);
      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.message || "Unable to save compliance partner.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="buyer-card space-y-4">
      {error && <p className="text-sm text-amber-700">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted">Partner ID</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.id}
            onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
            disabled={disableId}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Legal name</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.legalName}
            onChange={(event) => setForm((prev) => ({ ...prev, legalName: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Trading name</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.tradingName}
            onChange={(event) => setForm((prev) => ({ ...prev, tradingName: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Website URL</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.websiteUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Jurisdiction</label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.jurisdiction}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, jurisdiction: event.target.value as typeof prev.jurisdiction }))
            }
          >
            {JURISDICTION_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Country</label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.country}
            onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value as typeof prev.country }))}
          >
            {COUNTRY_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Status</label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as typeof prev.status }))}
          >
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">SLA (days)</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.slaDays}
            onChange={(event) => setForm((prev) => ({ ...prev, slaDays: event.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted">Certifications (comma-separated)</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.certificationsText}
            onChange={(event) => setForm((prev) => ({ ...prev, certificationsText: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Product categories (comma-separated)</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.categoriesText}
            onChange={(event) => setForm((prev) => ({ ...prev, categoriesText: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Product sub-categories (comma-separated)</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.subCategoriesText}
            onChange={(event) => setForm((prev) => ({ ...prev, subCategoriesText: event.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted">Contact name</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.contactName}
            onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Contact email</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.contactEmail}
            onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Contact phone</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={form.contactPhone}
            onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted">Capabilities (JSON)</label>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono h-36"
            value={form.capabilitiesJson}
            onChange={(event) => setForm((prev) => ({ ...prev, capabilitiesJson: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">API integration (JSON)</label>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono h-36"
            value={form.apiIntegrationJson}
            onChange={(event) => setForm((prev) => ({ ...prev, apiIntegrationJson: event.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted">Evidence (JSON)</label>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono h-36"
            value={form.evidenceJson}
            onChange={(event) => setForm((prev) => ({ ...prev, evidenceJson: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Offices (JSON)</label>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono h-36"
            value={form.officesJson}
            onChange={(event) => setForm((prev) => ({ ...prev, officesJson: event.target.value }))}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
