"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
import { getOrders, getSession } from "../../../../lib/store";
import Link from "next/link";
import { formatDate } from "../../../../lib/utils";
import { listDocumentsForBuyer } from "../../../../lib/documents";
import { getBuyerOrderStage, getDDPStatus, getFreightStageLabel, getOrderValue } from "../../../../lib/buyerDashboard";

export default function BuyerOrdersLanding() {
  const router = useRouter();
  const session = getSession();
  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
    }
  }, [router, session]);

  const orders = (session?.email ? getOrders().filter((o) => o.buyerEmail === session.email) : []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const docs = session?.email ? listDocumentsForBuyer(session.email) : [];

  return (
    <BuyerDashboardLayout title="Orders & Tracking">
      {orders.length === 0 ? (
        <p className="text-sm text-muted">No orders yet.</p>
      ) : (
        <div className="buyer-table">
          <div className="buyer-table-header">
            <span>Order ID</span>
            <span>Date</span>
            <span>Supplier</span>
            <span>Order Value</span>
            <span>DDP Status</span>
            <span>Freight Stage</span>
            <span>Documents</span>
            <span>Action</span>
          </div>
          {orders.map((order) => {
            const docCount = docs.filter((doc) => doc.orderId === order.orderId).length;
            const supplierLabel = order.supplierIds?.join(", ") || "Approved supplier";
            const isCompleted = order.status === "DELIVERED" || order.status === "SETTLED";
            return (
              <div key={order.orderId} className="buyer-table-row">
                <span className="text-sm font-semibold">{order.orderId}</span>
                <span className="text-xs text-muted">{formatDate(order.createdAt)}</span>
                <span>{supplierLabel}</span>
                <span>{getOrderValue(order)}</span>
                <span className="flex flex-wrap gap-2">
                  <span className="buyer-pill">{getDDPStatus(order)}</span>
                  {isCompleted && <span className="buyer-pill">Order Completed</span>}
                </span>
                <span className="buyer-pill">{getFreightStageLabel(order)}</span>
                <span>{docCount}</span>
                <Link href={`/dashboard/buyer/orders/${order.orderId}`} className="text-brand-700 font-semibold">
                  View
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </BuyerDashboardLayout>
  );
}
