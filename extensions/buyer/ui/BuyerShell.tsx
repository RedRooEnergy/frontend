/**
 * BuyerShell
 * Read-only UI wired to EXT-07 routes.
 * No mutations, no commands, no inferred state.
 */

import { useEffect, useState } from "react";
import { emitBuyerViewOrder } from "../events/buyer.events";

type OrderProjection = {
  orderId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  items?: {
    productName: string;
    quantity: number;
  }[];
  complianceStatus?: string;
  paymentStatus?: string;
  shippingStatus?: string;
};

export default function BuyerShell() {
  const [order, setOrder] = useState<OrderProjection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch("/buyer/orders/demo-order");
        const data = await res.json();
        setOrder(data.projection);
        emitBuyerViewOrder("demo-order");
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, []);

  if (loading) {
    return <p>Loading buyer view…</p>;
  }

  if (!order) {
    return <p>No order data available.</p>;
  }

  return (
    <div>
      <h1>Buyer Order View</h1>

      <p>
        <strong>Order ID:</strong> {order.orderId}
      </p>
      <p>
        <strong>Status:</strong> {order.status}
      </p>

      <h2>Items</h2>
      <ul>
        {order.items?.map((item, index) => (
          <li key={index}>
            {item.productName} × {item.quantity}
          </li>
        ))}
      </ul>

      <h2>System States</h2>
      <ul>
        <li>Payment: {order.paymentStatus}</li>
        <li>Compliance: {order.complianceStatus}</li>
        <li>Shipping: {order.shippingStatus}</li>
      </ul>
    </div>
  );
}
