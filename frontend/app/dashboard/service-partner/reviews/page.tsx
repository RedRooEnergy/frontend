"use client";

import { useEffect, useMemo, useState } from "react";
import ServicePartnerDashboardLayout from "../../../../components/ServicePartnerDashboardLayout";
import { fetchCompliancePartnersView } from "../../../../lib/compliancePartner/client";
import type { CompliancePartnerView } from "../../../../lib/compliancePartner/view";
import {
  getSupplierProductRecords,
  upsertSupplierProductRecord,
  SupplierProductRecord,
} from "../../../../lib/store";
import { recordAudit } from "../../../../lib/audit";
import {
  applyTransition,
  ComplianceWorkflowState,
} from "../../../../lib/compliance/workflowStateMachine";

export default function ServicePartnerReviewsPage() {
  const [partnerId, setPartnerId] = useState<string>("");
  const [records, setRecords] = useState<SupplierProductRecord[]>([]);
  const [partners, setPartners] = useState<CompliancePartnerView[]>([]);

  useEffect(() => {
    let active = true;
    fetchCompliancePartnersView()
      .then((items) => {
        if (active) setPartners(items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!partnerId && partners.length > 0) {
      setPartnerId(partners[0].id);
    }
  }, [partnerId, partners]);

  useEffect(() => {
    const data = getSupplierProductRecords();
    setRecords(data);
  }, []);

  const pending = useMemo(() => {
    return records.filter(
      (record) =>
        record.compliancePartnerId &&
        record.compliancePartnerId === partnerId &&
        record.partnerReviewStatus === "pending"
    );
  }, [records, partnerId]);

  const completed = useMemo(() => {
    return records.filter(
      (record) =>
        record.compliancePartnerId === partnerId &&
        (record.partnerReviewStatus === "pass" || record.partnerReviewStatus === "fail")
    );
  }, [records, partnerId]);

  const resolveWorkflowState = (record: SupplierProductRecord): ComplianceWorkflowState => {
    if (record.complianceWorkflowState) return record.complianceWorkflowState;
    if (record.complianceWorkflowStatus === "CERTIFIED") return "CERTIFIED";
    if (record.complianceWorkflowStatus === "FAILED") return "REJECTED";
    return "IN_REVIEW";
  };

  const handleUpdate = async (record: SupplierProductRecord, status: "pass" | "fail", reportName?: string) => {
    if (status === "pass" && (!record.certificationFeeBase || record.certificationFeeBase <= 0)) {
      alert("Certification fee base is required before marking PASS.");
      return;
    }
    const currentState = resolveWorkflowState(record);
    const nextState: ComplianceWorkflowState = status === "pass" ? "CERTIFIED" : "REJECTED";
    try {
      applyTransition(currentState, nextState, "COMPLIANCE_AGENCY", {
        workflowId: record.id,
        productId: record.id,
        supplierId: record.supplierId,
        compliancePartnerId: record.compliancePartnerId || partnerId,
        issuedCertificateId: status === "pass" ? record.partnerReviewReport?.fileName : undefined,
      });
    } catch (error: any) {
      alert(error?.message || "Compliance transition not permitted.");
      return;
    }
    const next: SupplierProductRecord = {
      ...record,
      partnerReviewStatus: status,
      certifierOfRecord: record.compliancePartnerId || partnerId,
      complianceWorkflowStatus: status === "pass" ? "CERTIFIED" : "FAILED",
      complianceWorkflowState: nextState,
      partnerReviewReport: reportName ? { fileName: reportName } : record.partnerReviewReport,
      updatedAt: new Date().toISOString(),
    };
    upsertSupplierProductRecord(next);
    setRecords((prev) => prev.map((item) => (item.id === record.id ? next : item)));
    recordAudit(status === "pass" ? "PARTNER_REVIEW_PASS" : "PARTNER_REVIEW_FAIL", {
      productId: record.id,
      partnerId,
      previousState: currentState,
      nextState,
    });

    if (status === "pass") {
      try {
        await fetch("/api/internal/fee-engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            triggerEvent: "WF_CERTIFIED",
            workflowId: record.id,
            supplierId: record.supplierId,
            servicePartnerId: record.compliancePartnerId || partnerId,
            certificationFeeBase: record.certificationFeeBase,
            currency: record.certificationFeeCurrency || "AUD",
          }),
        });
      } catch (e) {
        console.error("Failed to emit supplier certification fee event", e);
      }
    }
  };

  return (
    <ServicePartnerDashboardLayout title="Product Review Queue">
      <div className="space-y-4">
        <div className="bg-surface rounded-2xl shadow-card border p-4">
          <div className="text-sm font-semibold">Assigned compliance partner</div>
          <div className="mt-2">
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
            >
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name} · {partner.location} · SLA {partner.slaDays} days
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <div className="text-sm font-semibold">Pending reviews</div>
          {pending.length === 0 ? (
            <div className="text-sm text-muted">No products awaiting review.</div>
          ) : (
            pending.map((record) => (
              <div key={record.id} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">{record.name}</div>
                    <div className="text-xs text-muted">
                      Category: {record.categorySlug ?? "Not set"} · Sub-category: {record.subCategorySlug ?? "Not set"}
                    </div>
                  </div>
                  <span className="text-xs text-muted">Requested: {record.partnerReviewRequestedAt ?? "Pending"}</span>
                </div>
                <div className="text-xs text-muted">
                  Certifications: {Object.keys(record.certifications).length ? Object.keys(record.certifications).join(", ") : "None uploaded"}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted">
                  <label className="text-xs text-muted">
                    Certification fee base (AUD/NZD)
                    <input
                      type="number"
                      min="0"
                      className="mt-1 w-full border rounded-md px-2 py-1 text-xs"
                      value={record.certificationFeeBase ?? ""}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        const next: SupplierProductRecord = {
                          ...record,
                          certificationFeeBase: Number.isFinite(value) ? value : undefined,
                          certificationFeeCurrency: record.certificationFeeCurrency || "AUD",
                          updatedAt: new Date().toISOString(),
                        };
                        upsertSupplierProductRecord(next);
                        setRecords((prev) => prev.map((item) => (item.id === record.id ? next : item)));
                      }}
                    />
                  </label>
                  <label className="text-xs text-muted">
                    Currency
                    <select
                      className="mt-1 w-full border rounded-md px-2 py-1 text-xs"
                      value={record.certificationFeeCurrency || "AUD"}
                      onChange={(event) => {
                        const next: SupplierProductRecord = {
                          ...record,
                          certificationFeeCurrency: event.target.value as "AUD" | "NZD",
                          updatedAt: new Date().toISOString(),
                        };
                        upsertSupplierProductRecord(next);
                        setRecords((prev) => prev.map((item) => (item.id === record.id ? next : item)));
                      }}
                    >
                      <option value="AUD">AUD</option>
                      <option value="NZD">NZD</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="text-xs text-muted">
                    Upload review report (PDF)
                    <input
                      type="file"
                      accept="application/pdf"
                      className="block mt-1 text-sm"
                      onChange={(event) => {
                        const reportName = event.target.files?.[0]?.name;
                        if (!reportName) return;
                        const next: SupplierProductRecord = {
                          ...record,
                          partnerReviewReport: { fileName: reportName },
                          updatedAt: new Date().toISOString(),
                        };
                        upsertSupplierProductRecord(next);
                        setRecords((prev) => prev.map((item) => (item.id === record.id ? next : item)));
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="px-3 py-2 bg-brand-700 text-brand-100 rounded-md text-sm font-semibold"
                    onClick={() => handleUpdate(record, "pass")}
                  >
                    Mark Pass
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 border rounded-md text-sm font-semibold text-red-600"
                    onClick={() => handleUpdate(record, "fail")}
                  >
                    Mark Fail
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <div className="text-sm font-semibold">Completed reviews</div>
          {completed.length === 0 ? (
            <div className="text-sm text-muted">No completed reviews yet.</div>
          ) : (
            completed.map((record) => (
              <div key={record.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                <div>
                  <div className="text-sm font-semibold">{record.name}</div>
                  <div className="text-xs text-muted">
                    Status: {record.partnerReviewStatus} · Report: {record.partnerReviewReport?.fileName ?? "N/A"}
                  </div>
                </div>
                <span className="text-xs text-muted">{record.updatedAt.split("T")[0]}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </ServicePartnerDashboardLayout>
  );
}
