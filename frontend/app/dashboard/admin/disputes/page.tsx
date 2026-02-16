"use client";

import { useState } from "react";
import { adminPhaseEnabled } from "../../../../lib/featureFlags";
import { getAdminDisputes, setAdminDisputes, DisputeStatus } from "../../../../lib/store";
import { recordAudit } from "../../../../lib/audit";
import crypto from "crypto";

export default function AdminDisputesPage() {
  const enabled = adminPhaseEnabled();
  const [disputes, setDisputes] = useState(getAdminDisputes());
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState("");

  if (!enabled) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
          Grand-Master phase disabled (NEXT_PUBLIC_ADMIN_PHASE).
        </div>
      </div>
    );
  }

  const addDispute = () => {
    if (!orderId || !reason) return;
    const entry = {
      id: crypto.randomUUID(),
      orderId,
      status: "OPEN" as DisputeStatus,
      reason,
      updatedAt: new Date().toISOString(),
    };
    const list = [...disputes, entry];
    setDisputes(list);
    setAdminDisputes(list);
    recordAudit("ADMIN_DISPUTE_UPDATED", { orderId, status: "OPEN" });
    setOrderId("");
    setReason("");
  };

  const updateStatus = (id: string, status: DisputeStatus, resolutionText?: string) => {
    const list = disputes.map((d) =>
      d.id === id ? { ...d, status, resolution: resolutionText ?? d.resolution, updatedAt: new Date().toISOString() } : d
    );
    setDisputes(list);
    setAdminDisputes(list);
    recordAudit("ADMIN_DISPUTE_UPDATED", { orderId: list.find((d) => d.id === id)?.orderId, status });
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Disputes</h1>
        <p className="text-sm text-muted">
          Resolve disputes with evidence and recorded decisions. Forbidden: settlement release while IN_REVIEW; refund
          without outcome.
        </p>

        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <h2 className="text-lg font-semibold">Add dispute</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button onClick={addDispute} className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold">
              Create
            </button>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-card border">
          <div className="grid grid-cols-6 text-xs font-semibold text-muted px-3 py-2 border-b">
            <span>Order</span>
            <span>Status</span>
            <span>Reason</span>
            <span>Resolution</span>
            <span>Updated</span>
            <span>Actions</span>
          </div>
          {disputes.map((d) => (
            <div key={d.id} className="grid grid-cols-6 text-sm px-3 py-3 border-b last:border-b-0">
              <span>{d.orderId}</span>
              <span>{d.status}</span>
              <span className="text-xs text-muted">{d.reason}</span>
              <span className="text-xs text-muted">{d.resolution || "-"}</span>
              <span className="text-xs text-muted">{new Date(d.updatedAt).toLocaleString()}</span>
              <div className="flex gap-2 text-xs">
                {d.status !== "IN_REVIEW" && (
                  <button className="underline" onClick={() => updateStatus(d.id, "IN_REVIEW")}>
                    In review
                  </button>
                )}
                {d.status !== "RESOLVED" && (
                  <button
                    className="underline"
                    onClick={() => {
                      const res = prompt("Resolution note") || "";
                      updateStatus(d.id, "RESOLVED", res);
                    }}
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
          {disputes.length === 0 && <div className="px-3 py-3 text-sm text-muted">No disputes recorded.</div>}
        </div>
      </main>
    </div>
  );
}
