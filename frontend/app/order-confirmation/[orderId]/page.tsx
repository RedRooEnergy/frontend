 "use client";
import { useMemo } from "react";
import { notFound } from "next/navigation";
import { getOrders } from "../../../lib/store";

export default function OrderConfirmationPage({ params }: { params: { orderId: string } }) {
  const order = useMemo(() => getOrders().find((o) => o.orderId === params.orderId), [params.orderId]);
  if (!order) return notFound();

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Order Received</h1>
        <p className="text-sm text-muted">Status: Pending Payment/Settlement</p>
        <div className="bg-surface rounded-2xl shadow-card border p-5 space-y-3">
          <div className="text-sm text-muted">Order ID: {order.orderId}</div>
          <div className="text-sm text-muted">Created: {new Date(order.createdAt).toLocaleString()}</div>
          <div className="text-sm text-muted">Email: {order.buyerEmail}</div>
          <div className="text-sm text-muted">
            Shipping: {order.shippingAddress.line1}, {order.shippingAddress.city} {order.shippingAddress.state} {order.shippingAddress.postcode}
          </div>
          {order.deliveryNotes && <div className="text-sm text-muted">Notes: {order.deliveryNotes}</div>}
        </div>
        <div className="bg-surface rounded-2xl shadow-card border p-5 space-y-2">
          <h2 className="text-lg font-semibold">Items</h2>
          {order.items.map((item) => (
            <div key={item.productSlug} className="flex items-center justify-between text-sm">
              <span>{item.name} × {item.qty}</span>
              <span>${(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
