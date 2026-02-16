"use client";

import { useCallback, useEffect, useState } from "react";
import { adminPhaseEnabled } from "../../../../lib/featureFlags";
import {
  getComplianceDecisions,
  setComplianceDecisions,
  ComplianceDecisionStatus,
  getSupplierProductRecords,
  upsertSupplierProductRecord,
  SupplierProductRecord,
} from "../../../../lib/store";
import { recordAudit } from "../../../../lib/audit";
import crypto from "crypto";
import { applyTransition } from "../../../../lib/compliance/workflowStateMachine";
import { getAdminAuthHeaders } from "../../../../lib/auth/clientAdminHeaders";

export default function AdminCompliancePage() {
  const enabled = adminPhaseEnabled();
  const [decisions, setDecisions] = useState(getComplianceDecisions());
  const [orderId, setOrderId] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [rationale, setRationale] = useState("");
  const [workflowProductId, setWorkflowProductId] = useState("");
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);
  const [cecStatus, setCecStatus] = useState<any | null>(null);
  const [cecLoading, setCecLoading] = useState(false);
  const [cecError, setCecError] = useState<string | null>(null);
  const [cecSyncing, setCecSyncing] = useState(false);
  const [cecScheduleHours, setCecScheduleHours] = useState(24);
  const [cecScheduleEnabled, setCecScheduleEnabled] = useState(false);

  const loadCecStatus = useCallback(async () => {
    setCecLoading(true);
    setCecError(null);
    try {
      const response = await fetch("/api/admin/cec/status", {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Unable to load CEC status.");
      setCecStatus(json.latest || null);
      setCecScheduleEnabled(Boolean(json.schedule?.enabled));
      setCecScheduleHours(Number(json.schedule?.intervalHours || 24));
    } catch (err: any) {
      setCecError(err?.message || "Unable to load CEC status.");
    } finally {
      setCecLoading(false);
    }
  }, []);

  const runCecSync = async () => {
    setCecSyncing(true);
    setCecError(null);
    try {
      const response = await fetch("/api/admin/cec/sync", {
        method: "POST",
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "CEC sync failed.");
      await loadCecStatus();
    } catch (err: any) {
      setCecError(err?.message || "CEC sync failed.");
    } finally {
      setCecSyncing(false);
    }
  };

  const updateCecSchedule = async (enabled: boolean) => {
    setCecError(null);
    try {
      const response = await fetch("/api/admin/cec/schedule", {
        method: "POST",
        credentials: "include",
        headers: { ...getAdminAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, intervalHours: cecScheduleHours }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Unable to update schedule.");
      setCecScheduleEnabled(Boolean(json.status?.enabled));
      setCecScheduleHours(Number(json.status?.intervalHours || cecScheduleHours));
    } catch (err: any) {
      setCecError(err?.message || "Unable to update schedule.");
    }
  };

  useEffect(() => {
    if (!enabled) return;
    loadCecStatus();
  }, [enabled, loadCecStatus]);

  if (!enabled) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
          Grand-Master phase disabled (NEXT_PUBLIC_ADMIN_PHASE).
        </div>
      </div>
    );
  }

  const addDecision = (status: ComplianceDecisionStatus) => {
    if (!orderId) return;
    if (status === "APPROVED" && !rationale) return alert("Approval rationale required.");
    if (status === "REJECTED" && !rationale) return alert("Rejection rationale required.");
    const entry = {
      id: crypto.randomUUID(),
      orderId,
      productSlug: productSlug || undefined,
      status,
      rationale,
      approver: "admin",
      updatedAt: new Date().toISOString(),
    };
    const list = decisions.filter((d) => d.id !== entry.id).concat(entry);
    setDecisions(list);
    setComplianceDecisions(list);
    recordAudit("ADMIN_COMPLIANCE_DECIDED", { orderId, status });
    setRationale("");
  };

  const updateStatus = (id: string, status: ComplianceDecisionStatus) => {
    const list = decisions.map((d) => (d.id === id ? { ...d, status, updatedAt: new Date().toISOString() } : d));
    setDecisions(list);
    setComplianceDecisions(list);
    recordAudit("ADMIN_COMPLIANCE_DECIDED", { orderId: list.find((d) => d.id === id)?.orderId, status });
  };

  const findProductRecord = (productId: string): SupplierProductRecord | null => {
    if (!productId) return null;
    const records = getSupplierProductRecords();
    return records.find((record) => record.id === productId) || null;
  };

  const updateWorkflowState = (action: "SUSPEND" | "REINSTATE") => {
    const record = findProductRecord(workflowProductId.trim());
    if (!record) {
      setWorkflowMessage("Product record not found.");
      return;
    }
    const currentState = record.complianceWorkflowState ?? "CERTIFIED";
    const nextState = action === "SUSPEND" ? "SUSPENDED" : "CERTIFIED";
    try {
      applyTransition(currentState, nextState, "ADMIN", {
        workflowId: record.id,
        productId: record.id,
        supplierId: record.supplierId,
        compliancePartnerId: record.compliancePartnerId,
      });
    } catch (error: any) {
      setWorkflowMessage(error?.message || "Transition not permitted.");
      return;
    }
    const next: SupplierProductRecord = {
      ...record,
      complianceWorkflowState: nextState,
      complianceWorkflowStatus: nextState === "CERTIFIED" ? "CERTIFIED" : "FAILED",
      updatedAt: new Date().toISOString(),
    };
    upsertSupplierProductRecord(next);
    recordAudit("ADMIN_COMPLIANCE_DECIDED", {
      productId: record.id,
      action,
      previousState: currentState,
      nextState,
    });
    setWorkflowMessage(`Compliance workflow updated to ${nextState}.`);
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Compliance Approvals</h1>
        <p className="text-sm text-muted">
          Apply approvals/rejections with evidence. Forbidden: approving without evidence; releasing settlement while
          compliance is PENDING/REJECTED.
        </p>

        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">CEC sync status</div>
              <p className="text-xs text-muted">Tracks the latest Clean Energy Council data cache sync.</p>
            </div>
            <button
              onClick={runCecSync}
              className="px-3 py-2 rounded-md border border-slate-200 text-xs font-semibold"
              disabled={cecSyncing}
            >
              {cecSyncing ? "Syncing…" : "Run manual sync"}
            </button>
          </div>
          {cecLoading ? (
            <div className="text-xs text-muted">Loading CEC status…</div>
          ) : cecStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-muted">Last run</div>
                <div className="font-semibold">{new Date(cecStatus.runAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted">Fetched</div>
                <div className="font-semibold">{cecStatus.totalFetched}</div>
              </div>
              <div>
                <div className="text-muted">Updated</div>
                <div className="font-semibold">{cecStatus.updated}</div>
              </div>
              <div>
                <div className="text-muted">Status</div>
                <div className={`font-semibold ${cecStatus.failed ? "text-red-700" : "text-green-700"}`}>
                  {cecStatus.failed ? "Failed" : "OK"}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted">No CEC sync runs recorded yet.</div>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="text-muted">Scheduled sync</div>
            <input
              type="number"
              min={1}
              className="w-20 border rounded-md px-2 py-1 text-xs"
              value={cecScheduleHours}
              onChange={(event) => setCecScheduleHours(Number(event.target.value) || 24)}
            />
            <span className="text-muted">hours</span>
            <button
              onClick={() => updateCecSchedule(true)}
              className="px-3 py-1 rounded-md border border-slate-200 text-xs font-semibold"
            >
              Enable
            </button>
            <button
              onClick={() => updateCecSchedule(false)}
              className="px-3 py-1 rounded-md border border-slate-200 text-xs font-semibold"
            >
              Disable
            </button>
            <span className="text-muted">Current: {cecScheduleEnabled ? "Enabled" : "Disabled"}</span>
          </div>
          {cecError && <div className="text-xs text-amber-700">{cecError}</div>}
        </div>

        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <div className="text-sm font-semibold">Compliance workflow controls (Grand-Master only)</div>
          <p className="text-xs text-muted">
            Grand-Masters cannot certify or reject products. Only suspend or reinstate certified items.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Product record ID"
              value={workflowProductId}
              onChange={(e) => setWorkflowProductId(e.target.value)}
            />
            <button
              onClick={() => updateWorkflowState("SUSPEND")}
              className="px-3 py-2 bg-red-600 text-white rounded-md text-xs font-semibold"
            >
              Suspend (CERTIFIED → SUSPENDED)
            </button>
            <button
              onClick={() => updateWorkflowState("REINSTATE")}
              className="px-3 py-2 bg-green-600 text-white rounded-md text-xs font-semibold"
            >
              Reinstate (SUSPENDED → CERTIFIED)
            </button>
          </div>
          {workflowMessage && <div className="text-xs text-muted">{workflowMessage}</div>}
        </div>

        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Product slug (optional)"
              value={productSlug}
              onChange={(e) => setProductSlug(e.target.value)}
            />
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Rationale"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => addDecision("APPROVED")}
                className="px-3 py-2 bg-green-600 text-white rounded-md text-xs font-semibold"
              >
                Approve
              </button>
              <button
                onClick={() => addDecision("REJECTED")}
                className="px-3 py-2 bg-red-600 text-white rounded-md text-xs font-semibold"
              >
                Reject
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-card border">
          <div className="grid grid-cols-6 text-xs font-semibold text-muted px-3 py-2 border-b">
            <span>Order</span>
            <span>Product</span>
            <span>Status</span>
            <span>Rationale</span>
            <span>Updated</span>
            <span>Actions</span>
          </div>
          {decisions.map((d) => (
            <div key={d.id} className="grid grid-cols-6 text-sm px-3 py-3 border-b last:border-b-0">
              <span>{d.orderId}</span>
              <span>{d.productSlug || "-"}</span>
              <span>{d.status}</span>
              <span className="text-xs text-muted">{d.rationale || "-"}</span>
              <span className="text-xs text-muted">{new Date(d.updatedAt).toLocaleString()}</span>
              <div className="flex gap-2 text-xs">
                {d.status !== "APPROVED" && (
                  <button className="underline" onClick={() => updateStatus(d.id, "APPROVED")}>
                    Approve
                  </button>
                )}
                {d.status !== "REJECTED" && (
                  <button className="underline" onClick={() => updateStatus(d.id, "REJECTED")}>
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
          {decisions.length === 0 && <div className="px-3 py-3 text-sm text-muted">No compliance decisions recorded.</div>}
        </div>
      </main>
    </div>
  );
}
