"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
import { getOrders, getSession } from "../../../../lib/store";
import { formatDate } from "../../../../lib/utils";
import { getOrderValue } from "../../../../lib/buyerDashboard";

export default function BuyerPaymentsPage() {
  const router = useRouter();
  const session = getSession();

  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    }
  }, [router, session]);

  const orders = useMemo(
    () => (session?.email ? getOrders().filter((o) => o.buyerEmail === session.email) : []),
    [session?.email]
  );

  const escrowRows = orders.map((order) => ({
    orderId: order.orderId,
    status: order.escrowStatus ?? "HELD",
    total: getOrderValue(order),
    createdAt: order.createdAt,
  }));

  const refunds = orders.filter((order) => order.status === "REFUNDED" || order.refundId);

  const paymentHistory = orders
    .filter((order) => order.status !== "PENDING")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <BuyerDashboardLayout title="Payments & Billing">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Payment methods</div>
            <p className="text-sm text-muted">Managed during checkout and stored securely.</p>
          </div>
        </div>
        <div className="buyer-form-grid">
          <div className="buyer-card">
            <div className="text-sm font-semibold">Primary method</div>
            <div className="text-xs text-muted">No payment method on file.</div>
          </div>
          <div className="buyer-card">
            <div className="text-sm font-semibold">Billing profile</div>
            <div className="text-xs text-muted">GST summary generated per order.</div>
          </div>
        </div>
        <button className="mt-4 px-4 py-2 rounded-md bg-brand-700 text-white font-semibold hover:opacity-90 transition">
          Update payment method
        </button>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Escrow status</div>
          <div className="text-xs text-muted">Governed by order milestones</div>
        </div>
        {escrowRows.length === 0 ? (
          <p className="text-sm text-muted">No escrow activity yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {escrowRows.map((row) => (
              <div key={row.orderId} className="flex items-center justify-between">
                <span>
                  {row.orderId} · {row.total}
                </span>
                <span className="buyer-pill">{row.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Payment history</div>
          <div className="text-xs text-muted">Order-linked transactions</div>
        </div>
        {paymentHistory.length === 0 ? (
          <p className="text-sm text-muted">No payments processed yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {paymentHistory.map((order) => (
              <div key={order.orderId} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{order.orderId}</div>
                  <div className="text-xs text-muted">{formatDate(order.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{getOrderValue(order)}</div>
                  <div className="text-xs text-muted">{order.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Refunds & reversals</div>
          <div className="text-xs text-muted">Linked to approved returns</div>
        </div>
        {refunds.length === 0 ? (
          <p className="text-sm text-muted">No refunds issued.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {refunds.map((order) => (
              <div key={order.orderId} className="flex items-center justify-between">
                <span>{order.orderId}</span>
                <span className="buyer-pill is-danger">Refunded</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">GST & tax records</div>
          <div className="text-xs text-muted">Downloadable summaries</div>
        </div>
        <p className="text-sm text-muted">
          GST summaries are generated per order and stored in the Documents & Certificates vault.
        </p>
        <button className="mt-3 px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold">
          View GST records
        </button>
      </div>
    </BuyerDashboardLayout>
  );
}
