"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../../components/AdminDashboardLayout";
import CompliancePartnerForm from "../../../../../components/admin/CompliancePartnerForm";
import { CompliancePartnerRecord } from "../../../../../lib/compliancePartner/types";
import { getAdminAuthHeaders } from "../../../../../lib/auth/clientAdminHeaders";

export default function AdminCompliancePartnerDetailPage() {
  const params = useParams();
  const partnerId = String(params?.partnerId ?? "");
  const router = useRouter();
  const [partner, setPartner] = useState<CompliancePartnerRecord | null>(null);
  const [error, setError] = useState("");
  const [lockMessage, setLockMessage] = useState("");

  const load = async () => {
    try {
      const res = await fetch(`/api/admin/compliance-partners/${partnerId}`, {
        headers: getAdminAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Unable to load partner");
      setPartner(json.item);
    } catch (err: any) {
      setError(err?.message || "Unable to load compliance partner.");
    }
  };

  useEffect(() => {
    if (partnerId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const handleSave = async (payload: CompliancePartnerRecord) => {
    const res = await fetch(`/api/admin/compliance-partners/${partnerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Unable to update partner.");
    setPartner(json.item);
  };

  const lockPartner = async () => {
    const res = await fetch(`/api/admin/compliance-partners/${partnerId}/lock`, {
      method: "POST",
      headers: getAdminAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      setLockMessage(json?.error || "Unable to lock partner.");
      return;
    }
    setPartner(json.item);
    setLockMessage("Partner locked.");
    setTimeout(() => setLockMessage(""), 3000);
  };

  if (!partner) {
    return (
      <AdminDashboardLayout title="Compliance Partner">
        <div className="buyer-card">
          <div className="buyer-section-title">Partner not found</div>
          <p className="text-sm text-muted">{error || "This compliance partner does not exist."}</p>
          <button
            className="mt-3 px-3 py-2 rounded-md border border-slate-200 text-sm font-semibold"
            onClick={() => router.push("/dashboard/admin/compliance-partners")}
          >
            Back to list
          </button>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout title="Compliance Partner Detail">
      {lockMessage && <div className="text-sm text-emerald-700 mb-2">{lockMessage}</div>}
      {partner.audit?.locked && (
        <div className="text-sm text-amber-700 mb-3">This partner record is locked and cannot be edited.</div>
      )}
      <CompliancePartnerForm
        initial={partner}
        submitLabel="Save changes"
        onSubmit={handleSave}
        disableId
      />
      <div className="mt-4">
        <button
          className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold"
          onClick={lockPartner}
          disabled={partner.audit?.locked}
        >
          Lock record
        </button>
      </div>
    </AdminDashboardLayout>
  );
}

