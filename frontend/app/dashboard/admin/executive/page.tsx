"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import {
  getAdminDisputes,
  getComplianceDecisions,
  getOrders,
  getReturns,
  getServicePartnerTasks,
  getSupplierProfiles,
  getBuyers,
  getFreightExceptions,
  getSession,
} from "../../../../lib/store";

export default function AdminExecutiveOverviewPage() {
  const router = useRouter();
  const session = getSession();
  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);
  const orders = useMemo(() => getOrders(), []);
  const disputes = useMemo(() => getAdminDisputes(), []);
  const compliance = useMemo(() => getComplianceDecisions(), []);
  const returns = useMemo(() => getReturns(), []);
  const suppliers = useMemo(() => getSupplierProfiles(), []);
  const buyers = useMemo(() => getBuyers(), []);
  const tasks = useMemo(() => getServicePartnerTasks(), []);
  const freightExceptions = useMemo(() => getFreightExceptions(), []);

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const activeOrders = orders.filter((order) => !["DELIVERED", "SETTLED", "REFUNDED"].includes(order.status)).length;
  const paymentReview = orders.filter((order) => order.status === "PAYMENT_REVIEW_REQUIRED").length;
  const openDisputes = disputes.filter((d) => d.status !== "RESOLVED").length;
  const openFreightExceptions = freightExceptions.filter((e) => e.status !== "RESOLVED").length;
  const pendingCompliance = compliance.filter((c) => c.status === "PENDING").length;
  const approvedCompliance = compliance.filter((c) => c.status === "APPROVED").length;
  const totalCompliance = compliance.length || 1;

  return (
    <AdminDashboardLayout title="Grand-Master Executive Overview">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Marketplace KPIs</div>
            <p className="text-sm text-muted">Revenue, risk, and compliance health.</p>
          </div>
        </div>
        <div className="buyer-form-grid">
          <div className="buyer-card">
            <div className="text-xs text-muted">Total revenue</div>
            <div className="text-xl font-semibold">AUD {totalRevenue.toFixed(2)}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Active orders</div>
            <div className="text-xl font-semibold">{activeOrders}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Payment reviews</div>
            <div className="text-xl font-semibold">{paymentReview}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Open disputes</div>
            <div className="text-xl font-semibold">{openDisputes}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Freight exceptions</div>
            <div className="text-xl font-semibold">{openFreightExceptions}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Compliance approval rate</div>
            <div className="text-xl font-semibold">
              {Math.round((approvedCompliance / totalCompliance) * 100)}%
            </div>
          </div>
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Risk indicators</div>
          <div className="text-xs text-muted">Operational hotspots</div>
        </div>
        <div className="buyer-form-grid">
          <div>
            <div className="text-xs text-muted">Pending compliance decisions</div>
            <div className="text-lg font-semibold">{pendingCompliance}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Return requests</div>
            <div className="text-lg font-semibold">{returns.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Service tasks open</div>
            <div className="text-lg font-semibold">{tasks.filter((t) => t.status !== "COMPLETED").length}</div>
          </div>
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Marketplace health snapshot</div>
          <div className="text-xs text-muted">Live counts</div>
        </div>
        <div className="buyer-form-grid">
          <div className="buyer-card">
            <div className="text-xs text-muted">Buyers</div>
            <div className="text-xl font-semibold">{buyers.length}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Suppliers</div>
            <div className="text-xl font-semibold">{suppliers.length}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Orders</div>
            <div className="text-xl font-semibold">{orders.length}</div>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
