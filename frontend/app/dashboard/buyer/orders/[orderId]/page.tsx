"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BuyerDashboardLayout from "../../../../../components/BuyerDashboardLayout";
import { getOrders, getSession, OrderTimelineEvent, OrderStatus, writeStore } from "../../../../../lib/store";
import { formatDate } from "../../../../../lib/utils";
import { recordAudit } from "../../../../../lib/audit";
import ReturnLink from "../../../../../components/ReturnLink";
import { canRefund } from "../../../../../lib/escrow";
import { getAdminFlags } from "../../../../../lib/store";
import { listDocumentsForBuyer } from "../../../../../lib/documents";
import { getProduct } from "../../../../../data/categories";
import { getBuyerOrderStage, getDDPStatus, getFreightStageLabel, getOrderValue } from "../../../../../lib/buyerDashboard";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "PAYMENT_INITIATED",
  "PAID",
  "PAYMENT_REVIEW_REQUIRED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "SETTLEMENT_ELIGIBLE",
  "SETTLED",
  "REFUND_REQUESTED",
  "REFUNDED",
];
const statusLabels: Record<OrderStatus | "CANCELLED", string> = {
  PENDING: "Pending",
  PAYMENT_INITIATED: "Payment initiated",
  PAID: "Paid",
  PAYMENT_REVIEW_REQUIRED: "Payment under review",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  SETTLEMENT_ELIGIBLE: "Settlement eligible",
  SETTLED: "Settled",
  REFUND_REQUESTED: "Refund requested",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export default function BuyerOrderDetail({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const session = getSession();

  useEffect(() => {
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
      return;
    }
    recordAudit("BUYER_VIEW_ORDER", { orderId: params.orderId });
  }, [router, session, params.orderId]);

  const order = useMemo(() => {
    const all = getOrders();
    if (!session?.email) return undefined;
    return all.find((o) => o.orderId === params.orderId && o.buyerEmail === session.email);
  }, [params.orderId, session?.email]);

  if (!order) {
    return (
      <BuyerDashboardLayout title="Order not found">
        <p className="text-sm text-muted">No order matches this ID.</p>
      </BuyerDashboardLayout>
    );
  }

  const docs = session?.email ? listDocumentsForBuyer(session.email, [order.orderId]) : [];
  const timeline: OrderTimelineEvent[] =
    order.timeline && order.timeline.length > 0
      ? order.timeline
      : order.status === "CANCELLED"
      ? [
          {
            status: "PENDING",
            timestamp: order.createdAt,
          },
          {
            status: "PROCESSING",
            timestamp: order.createdAt,
            note: "Order cancelled before shipment",
          },
        ]
      : (() => {
          const idx = STATUSES.indexOf(order.status as OrderStatus);
          const list = idx >= 0 ? STATUSES.slice(0, idx + 1) : STATUSES;
          return list.map((status) => ({
            status,
            timestamp: order.createdAt,
          }));
        })();

  return (
    <BuyerDashboardLayout title={`Order ${order.orderId}`}>
      <div className="space-y-4">
        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Order summary</div>
            <div className="flex flex-wrap gap-2">
              <div className="buyer-pill">{getDDPStatus(order)}</div>
              {(order.status === "DELIVERED" || order.status === "SETTLED") && (
                <div className="buyer-pill">Order Completed</div>
              )}
            </div>
          </div>
          <div className="buyer-form-grid">
            <div>
              <div className="text-xs text-muted">Placed</div>
              <div className="text-base font-semibold">{formatDate(order.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Order status</div>
              <div className="text-base font-semibold">{statusLabels[order.status] || order.status}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Order value (locked)</div>
              <div className="text-base font-semibold">{getOrderValue(order)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Freight stage</div>
              <div className="text-base font-semibold">{getFreightStageLabel(order)}</div>
            </div>
            <div className="buyer-span-2">
              <div className="text-xs text-muted">Pricing snapshot hash</div>
              <div className="text-sm font-semibold">{order.pricingSnapshotHash || "Pending snapshot"}</div>
            </div>
          </div>
          {order.status === "PENDING" && (
            <div className="mt-4 flex justify-end">
              <Link
                href={`/checkout?orderId=${order.orderId}`}
                className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold"
              >
                Pay Now
              </Link>
            </div>
          )}
          {(order.status === "PENDING" || order.status === "PAYMENT_INITIATED") && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={async () => {
                  const orders = getOrders();
                  const idx = orders.findIndex((o) => o.orderId === order.orderId);
                  if (idx === -1) return;
                  orders[idx] = {
                    ...orders[idx],
                    status: "CANCELLED",
                    timeline: [
                      ...(orders[idx].timeline || []),
                      { status: "CANCELLED", timestamp: new Date().toISOString(), note: "Order cancelled by buyer" },
                    ],
                  };
                  writeStore("orders" as any, orders as any);
                  recordAudit("BUYER_ORDER_CANCELLED", { orderId: order.orderId });
                  fetch("/api/orders/notify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      orderId: order.orderId,
                      buyerEmail: order.buyerEmail,
                      supplierIds: order.supplierIds || [],
                      event: "ORDER_CANCELLED",
                    }),
                  }).catch((err) => console.error("Order cancelled email notify failed", err));
                  router.refresh();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md font-semibold"
              >
                Cancel Order
              </button>
            </div>
          )}
          {order.status === "PAID" && (
            <div className="mt-3 text-sm text-muted">Paid – funds held in escrow (test mode).</div>
          )}
          {order.status === "PAYMENT_REVIEW_REQUIRED" && (
            <div className="mt-3 text-sm text-amber-700">
              Payment received but requires verification. Support has been notified.
            </div>
          )}
          {canRefund(order, getAdminFlags().refundOverride === true) && order.status !== "REFUND_REQUESTED" && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={async () => {
                  const reason = "Buyer requested refund";
                  await fetch("/api/payments/stripe/refund", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId: order.orderId, reason }),
                  });
                  recordAudit("BUYER_REFUND_REQUESTED", { orderId: order.orderId });
                  router.refresh();
                }}
                className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold"
              >
                Request Refund
              </button>
            </div>
          )}
          {order.status === "REFUND_REQUESTED" && (
            <div className="mt-3 text-sm text-muted">
              Refund requested. We will process via your original payment method.
            </div>
          )}
          {order.status === "REFUNDED" && (
            <div className="mt-3 text-sm text-muted">
              Refund processed via original payment method (test mode).
            </div>
          )}
        </div>

        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Line items</div>
            <div className="text-xs text-muted">Immutable order scope</div>
          </div>
          <div className="space-y-3">
            {order.items.map((item) => {
              const product = getProduct(item.productSlug);
              const complianceTags = product?.product.complianceTags || [];
              return (
                <div key={item.productSlug} className="buyer-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link href={`/products/${item.productSlug}`} className="text-brand-700 font-semibold">
                        {item.name}
                      </Link>
                      <div className="text-xs text-muted">Qty {item.qty}</div>
                    </div>
                    <div className="text-sm font-semibold">${(item.price * item.qty).toFixed(2)}</div>
                  </div>
                  {complianceTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {complianceTags.map((tag) => (
                        <span key={tag} className="buyer-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {order.status === "DELIVERED" && (
                    <div className="mt-2">
                      <ReturnLink orderId={order.orderId} productSlug={item.productSlug} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Freight and customs milestones</div>
            <div className="text-xs text-muted">Event-driven, locked</div>
          </div>
          <div className="space-y-2">
            {timeline.map((event) => (
              <div key={event.status} className="flex items-center justify-between text-sm">
                <div className="font-semibold">{statusLabels[event.status]}</div>
                <div className="text-muted">{formatDate(event.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Duty and GST breakdown</div>
            <div className="text-xs text-muted">Customs outcome required</div>
          </div>
          <div className="buyer-form-grid">
            <div>
              <div className="text-xs text-muted">Duty</div>
              <div className="text-base font-semibold">Pending customs assessment</div>
            </div>
            <div>
              <div className="text-xs text-muted">GST</div>
              <div className="text-base font-semibold">Pending customs assessment</div>
            </div>
          </div>
        </div>

        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Last-mile delivery</div>
            <div className="text-xs text-muted">Delivery confirmation & POD</div>
          </div>
          <p className="text-sm text-muted">
            {order.shippingAddress.line1}, {order.shippingAddress.city} {order.shippingAddress.state}{" "}
            {order.shippingAddress.postcode}
          </p>
          {order.deliveryNotes && <p className="text-sm text-muted">Notes: {order.deliveryNotes}</p>}
          <div className="mt-2 text-sm">
            POD: {order.deliveredAt ? `Delivered ${formatDate(order.deliveredAt)}` : "Pending"}
          </div>
        </div>

        <div className="buyer-card">
          <div className="buyer-card-header">
            <div className="buyer-section-title">Documents & certificates</div>
            <div className="text-xs text-muted">Immutable, timestamped</div>
          </div>
          {docs.length === 0 ? (
            <p className="text-sm text-muted">No documents issued yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {docs.map((doc) => (
                <div key={doc.documentId} className="flex items-center justify-between">
                  <span>{doc.name}</span>
                  <span className="text-xs text-muted">{formatDate(doc.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BuyerDashboardLayout>
  );
}
