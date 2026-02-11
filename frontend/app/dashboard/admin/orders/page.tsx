"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardLayout from "../../../../components/AdminDashboardLayout";
import {
  getAdminDisputes,
  getFreightExceptions,
  getOrders,
  getReturns,
  getShipmentUpdates,
  OrderRecord,
  getSession,
} from "../../../../lib/store";
import { formatDate } from "../../../../lib/utils";

function orderNeedsEscalation(order: OrderRecord) {
  return ["PAYMENT_REVIEW_REQUIRED", "REFUND_REQUESTED"].includes(order.status);
}

export default function AdminOrdersEscalationsPage() {
  const router = useRouter();
  const session = getSession();
  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.replace("/signin?role=admin");
    }
  }, [router, session]);
  const orders = useMemo(() => getOrders(), []);
  const disputes = useMemo(() => getAdminDisputes(), []);
  const returns = useMemo(() => getReturns(), []);
  const shipments = useMemo(() => getShipmentUpdates(), []);
  const freightExceptions = useMemo(
    () =>
      getFreightExceptions()
        .filter((entry) => entry.status !== "RESOLVED")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    []
  );

  const escalations = orders.filter(orderNeedsEscalation);

  return (
    <AdminDashboardLayout title="Admin Orders & Escalations">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Orders requiring attention</div>
            <p className="text-sm text-muted">Stuck orders, SLA breaches, disputes, interventions.</p>
          </div>
          <span className="buyer-pill">{escalations.length} escalations</span>
        </div>
        {escalations.length === 0 ? (
          <p className="text-sm text-muted">No escalations right now.</p>
        ) : (
          <div className="space-y-2">
            {escalations.map((order) => (
              <div key={order.orderId} className="buyer-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{order.orderId}</div>
                    <div className="text-xs text-muted">Buyer {order.buyerEmail}</div>
                  </div>
                  <div className="text-right space-y-2">
                    <span className="buyer-pill is-danger">{order.status}</span>
                    <div className="text-xs text-muted">{formatDate(order.createdAt)}</div>
                    <div className="flex gap-2 justify-end">
                      <button
                        className="text-xs font-semibold text-brand-700"
                        onClick={async () => {
                          await fetch("/api/admin/orders/complete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ orderId: order.orderId }),
                          });
                          window.location.reload();
                        }}
                      >
                        Mark completed
                      </button>
                      <button
                        className="text-xs font-semibold text-emerald-700"
                        onClick={async () => {
                          await fetch("/api/admin/freight/delivery-confirm", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ orderId: order.orderId }),
                          });
                          window.location.reload();
                        }}
                      >
                        Confirm delivery
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Active disputes</div>
          <div className="text-xs text-muted">Arbitration workflow</div>
        </div>
        {disputes.length === 0 ? (
          <p className="text-sm text-muted">No disputes recorded.</p>
        ) : (
          <div className="space-y-2">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="buyer-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Order {dispute.orderId}</div>
                    <div className="text-xs text-muted">{dispute.reason}</div>
                  </div>
                  <span className="buyer-pill">{dispute.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Returns & inspection queue</div>
          <div className="text-xs text-muted">Evidence-based outcomes</div>
        </div>
        {returns.length === 0 ? (
          <p className="text-sm text-muted">No return requests.</p>
        ) : (
          <div className="space-y-2">
            {returns.map((ret) => (
              <div key={ret.rmaId} className="buyer-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{ret.rmaId}</div>
                    <div className="text-xs text-muted">Order {ret.orderId}</div>
                  </div>
                  <span className="buyer-pill">{ret.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Freight exception escalation references</div>
          <div className="text-xs text-muted">Deterministic reference map for open freight exceptions</div>
        </div>
        {freightExceptions.length === 0 ? (
          <p className="text-sm text-muted">No open freight exceptions.</p>
        ) : (
          <div className="space-y-2">
            {freightExceptions.map((exception) => (
              <div key={exception.id} className="buyer-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Exception {exception.id}</div>
                    <div className="text-xs text-muted">Shipment {exception.shipmentId}</div>
                    <div className="text-xs text-muted">
                      {exception.issueType} · {exception.severity}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="buyer-pill">{exception.status}</span>
                    <div className="text-xs text-muted">{formatDate(exception.updatedAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Shipment milestone log</div>
          <div className="text-xs text-muted">SLA timeline for last-mile visibility</div>
        </div>
        {shipments.length === 0 ? (
          <p className="text-sm text-muted">No shipment events yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="flex items-center justify-between">
                <span>
                  {shipment.trackingId ?? shipment.id} · {shipment.milestone}
                </span>
                <span className="text-xs text-muted">{formatDate(shipment.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
