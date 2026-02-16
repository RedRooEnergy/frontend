"use client";

import { useMemo } from "react";
import { adminPhaseEnabled } from "../../../../lib/featureFlags";
import { readAudit } from "../../../../lib/audit";
import { getOrders, getAdminExports, setAdminExports } from "../../../../lib/store";
import crypto from "crypto";

export default function AdminAuditExportsPage() {
  const enabled = adminPhaseEnabled();
  const audits = useMemo(() => readAudit(), []);
  const orders = useMemo(() => getOrders(), []);
  const exports = useMemo(() => getAdminExports(), []);

  if (!enabled) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
          Grand-Master phase disabled (NEXT_PUBLIC_ADMIN_PHASE).
        </div>
      </div>
    );
  }

  const generate = (type: string) => {
    const now = new Date().toISOString();
    const payload =
      type === "payments"
        ? orders.map((o) => ({
            orderId: o.orderId,
            status: o.status,
            currency: o.currency,
            total: o.total,
            escrowStatus: o.escrowStatus,
            stripeSessionId: o.stripeSessionId,
            stripePaymentIntentId: o.stripePaymentIntentId,
          }))
        : audits.slice(-50);
    const hash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const record = {
      id: crypto.randomUUID(),
      type,
      createdAt: now,
      hash,
      requester: "admin",
    };
    const list = [...exports, record];
    setAdminExports(list);
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Audit Exports</h1>
        <p className="text-sm text-muted">
          Generate governance-ready exports. Forbidden: exporting secrets/keys; every export must log integrity hash.
        </p>

        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold" onClick={() => generate("payments")}>
              Export payments (hash only)
            </button>
            <button className="px-4 py-2 bg-surface border rounded-md font-semibold" onClick={() => generate("audit")}>
              Export audit tail (hash only)
            </button>
          </div>
          <p className="text-xs text-muted">Exports retained locally with hash for integrity; no secrets included.</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-card border">
          <div className="grid grid-cols-4 text-xs font-semibold text-muted px-3 py-2 border-b">
            <span>ID</span>
            <span>Type</span>
            <span>Hash</span>
            <span>Created</span>
          </div>
          {exports.map((e) => (
            <div key={e.id} className="grid grid-cols-4 text-xs px-3 py-2 border-b last:border-b-0">
              <span className="truncate">{e.id}</span>
              <span>{e.type}</span>
              <span className="truncate">{e.hash}</span>
              <span>{new Date(e.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {exports.length === 0 && <div className="px-3 py-3 text-sm text-muted">No exports generated.</div>}
        </div>
      </main>
    </div>
  );
}
