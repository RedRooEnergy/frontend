"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrders, getSession, OrderStatus } from "../../../../lib/store";
import { recordAudit } from "../../../../lib/audit";

const statusOrder: OrderStatus[] = [
  "PENDING",
  "PAYMENT_INITIATED",
  "PAYMENT_REVIEW_REQUIRED",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "SETTLEMENT_ELIGIBLE",
  "SETTLED",
  "REFUND_REQUESTED",
  "REFUNDED",
];

export default function PaymentsClient() {
  const [guarded, setGuarded] = useState(false);
  const session = getSession();

  useEffect(() => {
    if (!session || session.role !== "admin") {
      setGuarded(true);
    } else {
      recordAudit("ADMIN_VIEW_PAYMENTS", {});
    }
  }, [session]);

  const orders = useMemo(() => getOrders(), []);

  if (guarded) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="text-sm text-muted">Grand-Master access required.</div>
      </div>
    );
  }

  const counts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const sorted = [...orders].sort(
    (a, b) => statusOrder.indexOf(a.status as OrderStatus) - statusOrder.indexOf(b.status as OrderStatus)
  );

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Payments & Escrow (Sandbox)</h1>
          <p className="text-sm text-muted">Read-only overview of payments, escrow holds, and review flags.</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {statusOrder.map((status) => (
              <span key={status} className="px-3 py-1 rounded-full bg-surface shadow-sm border text-muted">
                {status}: {counts[status] || 0}
              </span>
            ))}
          </div>
        </header>

        <div className="bg-surface rounded-2xl shadow-card border divide-y">
          <div className="grid grid-cols-6 text-xs font-semibold text-muted px-4 py-3">
            <span>Order</span>
            <span>Status</span>
            <span>Escrow</span>
            <span>Amount</span>
            <span>Currency</span>
            <span>Flags</span>
          </div>
          {sorted.length === 0 && <div className="px-4 py-3 text-sm text-muted">No orders recorded.</div>}
          {sorted.map((order) => (
            <div key={order.orderId} className="grid grid-cols-6 text-sm px-4 py-3">
              <span className="font-semibold">{order.orderId}</span>
              <span>{order.status}</span>
              <span>{order.escrowStatus ?? "-"}</span>
              <span>${order.total.toFixed(2)}</span>
              <span>{(order.currency || "aud").toUpperCase()}</span>
              <span className="text-xs text-muted">
                {order.status === "PAYMENT_REVIEW_REQUIRED" ? "Review required" : ""}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
