"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrders, getSession } from "../../../../lib/store";
import { recordAudit } from "../../../../lib/audit";
import { canSettle } from "../../../../lib/escrow";

export default function SettlementsClient() {
  const [guarded, setGuarded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const session = getSession();
  const orders = useMemo(() => getOrders(), []);

  useEffect(() => {
    if (!session || session.role !== "admin") {
      setGuarded(true);
    } else {
      recordAudit("ADMIN_VIEW_SETTLEMENTS", {});
    }
  }, [session]);

  const eligible = orders.filter((o) => canSettle(o) && o.escrowStatus === "HELD");
  const settled = orders.filter((o) => o.status === "SETTLED");

  const release = async (orderId: string) => {
    setLoading(orderId);
    await fetch("/api/settlements/wise/create-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    setLoading(null);
    location.reload();
  };

  if (guarded) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="text-sm text-muted">Grand-Master access required.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Settlements (Wise Sandbox)</h1>
          <p className="text-sm text-muted">Grand-Master-controlled release of escrowed funds.</p>
        </header>

        <section className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Eligible for Settlement</h2>
            <span className="text-sm text-muted">Count: {eligible.length}</span>
          </div>
          {eligible.length === 0 && <p className="text-sm text-muted">No eligible orders.</p>}
          {eligible.map((o) => (
            <div key={o.orderId} className="grid grid-cols-5 gap-3 text-sm items-center py-2 border-b last:border-b-0">
              <span className="font-semibold">{o.orderId}</span>
              <span>${o.total.toFixed(2)}</span>
              <span>{(o.currency || "aud").toUpperCase()}</span>
              <span>Escrow: {o.escrowStatus ?? "-"}</span>
              <button
                onClick={() => release(o.orderId)}
                className="px-3 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold text-xs"
                disabled={loading === o.orderId}
              >
                {loading === o.orderId ? "Releasing..." : "Release Funds"}
              </button>
            </div>
          ))}
        </section>

        <section className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Settled</h2>
            <span className="text-sm text-muted">Count: {settled.length}</span>
          </div>
          {settled.length === 0 && <p className="text-sm text-muted">No settled orders yet.</p>}
          {settled.map((o) => (
            <div key={o.orderId} className="grid grid-cols-4 gap-3 text-sm py-2 border-b last:border-b-0">
              <span className="font-semibold">{o.orderId}</span>
              <span>${o.total.toFixed(2)}</span>
              <span>{(o.currency || "aud").toUpperCase()}</span>
              <span>Escrow: {o.escrowStatus ?? "-"}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
