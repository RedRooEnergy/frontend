"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getOrders, getSession, OrderRecord } from "../../lib/store";

const TRACK_STEPS = [
  "Order placed",
  "Supplier",
  "Dispatch",
  "Freight / Shipping",
  "Customs / Duty",
  "Last mile",
];

function statusToProgress(status: OrderRecord["status"]) {
  switch (status) {
    case "PENDING":
    case "PAYMENT_INITIATED":
    case "PAYMENT_REVIEW_REQUIRED":
      return 0;
    case "PAID":
    case "PROCESSING":
      return 1;
    case "SHIPPED":
      return 3;
    case "DELIVERED":
    case "SETTLEMENT_ELIGIBLE":
    case "SETTLED":
    case "REFUND_REQUESTED":
    case "REFUNDED":
      return 5;
    default:
      return 0;
  }
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return value;
  }
}

export default function OrdersPage() {
  const session = getSession();
  const [orders] = useState(getOrders());

  const myOrders = useMemo(() => {
    if (!session) return [];
    return orders.filter((order) => order.buyerEmail === session.email);
  }, [orders, session]);

  if (!session) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong">
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-3">
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-sm text-muted">You must be logged in to view your orders.</p>
            <Link href="/signin" className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold inline-block">
              Sign in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted">Track the progress of your orders and delivery milestones.</p>
        </div>

        {myOrders.length === 0 ? (
          <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
            You have no orders yet.
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.map((order) => {
              const progress = statusToProgress(order.status);
              return (
                <div key={order.orderId} className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-sm text-muted">Order ID</div>
                      <div className="text-base font-semibold">{order.orderId}</div>
                      <div className="text-xs text-muted">Placed {formatDate(order.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">Status</div>
                      <div className="text-base font-semibold">{order.status}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">Total</div>
                      <div className="text-base font-semibold">${order.total.toFixed(2)}</div>
                    </div>
                    <Link href={`/buyer/order/${order.orderId}`} className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold">
                      View order
                    </Link>
                  </div>

                  <div className="order-track">
                    {TRACK_STEPS.map((step, idx) => {
                      const isDone = idx <= progress;
                      const isActive = idx === progress;
                      return (
                        <div key={step} className={`order-track-step ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`}>
                          <div className="order-track-dot" />
                          <div className="order-track-label">{step}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
