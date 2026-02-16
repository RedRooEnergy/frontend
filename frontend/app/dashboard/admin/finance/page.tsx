"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import { getOrders, getSession } from "../../../../lib/store";

export default function AdminFinancePage() {
  const router = useRouter();
  const session = getSession();
  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);
  const orders = useMemo(() => getOrders(), []);

  const held = orders.filter((o) => o.escrowStatus === "HELD").length;
  const released = orders.filter((o) => o.escrowStatus === "RELEASED").length;
  const settled = orders.filter((o) => o.escrowStatus === "SETTLED").length;
  const refundRequested = orders.filter((o) => o.status === "REFUND_REQUESTED").length;
  const refunded = orders.filter((o) => o.status === "REFUNDED").length;

  return (
    <AdminDashboardLayout title="Grand-Master Payments, Escrow & Settlement">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Funds flow overview</div>
            <p className="text-sm text-muted">Escrow holds, releases, refunds, reconciliation.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/admin/payments" className="text-sm font-semibold text-brand-700">
              View payments
            </Link>
            <Link href="/dashboard/admin/settlements" className="text-sm font-semibold text-brand-700">
              View settlements
            </Link>
          </div>
        </div>
        <div className="buyer-form-grid">
          <div className="buyer-card">
            <div className="text-xs text-muted">Escrow held</div>
            <div className="text-xl font-semibold">{held}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Escrow released</div>
            <div className="text-xl font-semibold">{released}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Settled</div>
            <div className="text-xl font-semibold">{settled}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Refund requests</div>
            <div className="text-xl font-semibold">{refundRequested}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Refunded</div>
            <div className="text-xl font-semibold">{refunded}</div>
          </div>
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Reconciliation notes</div>
          <div className="text-xs text-muted">Audit-ready summaries</div>
        </div>
        <p className="text-sm text-muted">
          Settlement approvals and refunds are logged in the audit trail. Escrow release is permitted only when
          governance gates are met.
        </p>
      </div>
    </AdminDashboardLayout>
  );
}
