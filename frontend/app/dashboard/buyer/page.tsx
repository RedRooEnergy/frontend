"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../components/BuyerDashboardLayout";
import { getOrders, getSession } from "../../../lib/store";
import { listDocumentsForBuyer } from "../../../lib/documents";
import { formatDate } from "../../../lib/utils";
import { listBuyerNotifications } from "../../../lib/notifications";
import {
  getBuyerOrderStage,
  getBuyerOrderProgress,
  getDDPStatus,
  getOrderValue,
  getOutstandingAction,
} from "../../../lib/buyerDashboard";

export default function BuyerDashboard() {
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
  const documents = useMemo(
    () => (session?.email ? listDocumentsForBuyer(session.email) : []),
    [session?.email]
  );
  const notifications = useMemo(
    () => (session?.email ? listBuyerNotifications(session.email) : []),
    [session?.email]
  );

  const statusCounts = useMemo(() => {
    const counts = { Processing: 0, "In Transit": 0, Customs: 0, "Out for Delivery": 0, Delivered: 0 };
    orders.forEach((order) => {
      counts[getBuyerOrderStage(order)] += 1;
    });
    return counts;
  }, [orders]);

  const activeShipments = orders
    .filter((order) => getBuyerOrderStage(order) !== "Delivered")
    .slice(0, 4);
  const outstandingActions = orders
    .map((order) => ({ order, action: getOutstandingAction(order) }))
    .filter((entry) => entry.action)
    .slice(0, 4);
  const recentDocs = documents
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);
  const alerts = notifications.slice(0, 5);

  return (
    <BuyerDashboardLayout title="Buyer Overview">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="text-sm text-muted">Operational summary</div>
            <div className="buyer-section-title">Active orders by status</div>
          </div>
          <div className="text-xs text-muted">Read-only, system derived</div>
        </div>
        <div className="buyer-stat-grid">
          {Object.entries(statusCounts).map(([label, count]) => (
            <div key={label} className="buyer-card">
              <div className="text-xs text-muted">{label}</div>
              <div className="text-xl font-semibold">{count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Active shipments</div>
          <div className="text-xs text-muted">DDP tracked milestones</div>
        </div>
        {activeShipments.length === 0 ? (
          <p className="text-sm text-muted">No active shipments right now.</p>
        ) : (
          <div className="space-y-3">
            {activeShipments.map((order) => (
              <div key={order.orderId} className="buyer-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted">Order</div>
                    <div className="text-sm font-semibold">{order.orderId}</div>
                  </div>
                  <div className="text-xs text-muted">{getDDPStatus(order)}</div>
                </div>
                <div className="mt-2 buyer-progress">
                  <div className="buyer-progress-bar" style={{ width: `${getBuyerOrderProgress(order)}%` }} />
                </div>
                <div className="mt-2 text-xs text-muted">{getBuyerOrderStage(order)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Outstanding actions</div>
          <div className="text-xs text-muted">Required buyer input</div>
        </div>
        {outstandingActions.length === 0 ? (
          <p className="text-sm text-muted">No outstanding actions.</p>
        ) : (
          <div className="space-y-2">
            {outstandingActions.map(({ order, action }) => (
              <div key={order.orderId} className="flex items-center justify-between text-sm">
                <span>
                  {order.orderId} — {action}
                </span>
                <span className="buyer-pill">Order {getOrderValue(order)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Recent documents</div>
          <div className="text-xs text-muted">Invoices & certificates</div>
        </div>
        {recentDocs.length === 0 ? (
          <p className="text-sm text-muted">No documents issued yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {recentDocs.map((doc) => (
              <div key={doc.documentId} className="flex items-center justify-between">
                <span>{doc.name}</span>
                <span className="text-xs text-muted">{formatDate(doc.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Alerts & notices</div>
          <div className="text-xs text-muted">Governed system events</div>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted">No alerts right now.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between">
                <span>{alert.title}</span>
                <span className="text-xs text-muted">{formatDate(alert.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </BuyerDashboardLayout>
  );
}
