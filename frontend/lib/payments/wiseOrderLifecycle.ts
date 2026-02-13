import { markSettled } from "../escrow";
import { getOrders, writeStore, type OrderRecord, type OrderStatus } from "../store";

function appendTimeline(order: OrderRecord, note: string) {
  return {
    ...order,
    timeline: [
      ...(order.timeline || []),
      {
        status: "SETTLEMENT_ELIGIBLE" as OrderStatus,
        timestamp: new Date().toISOString(),
        note,
      },
    ],
  } as OrderRecord;
}

export function markWiseTransferAccepted(orderId: string, transferId: string) {
  const orders = getOrders();
  const index = orders.findIndex((entry) => entry.orderId === orderId);
  if (index === -1) return null;

  if (orders[index].wiseTransferId === transferId) {
    return orders[index];
  }

  const next = appendTimeline(
    {
      ...orders[index],
      wiseTransferId: transferId,
    },
    `Settlement transfer accepted by Wise (${transferId})`
  );

  orders[index] = next;
  writeStore("orders" as any, orders as any);
  return next;
}

export function markWiseTransferTerminal(
  orderId: string,
  terminalState: "COMPLETED" | "FAILED" | "CANCELLED" | "TIMED_OUT",
  transferId?: string | null,
  reasonCode?: string | null
) {
  const orders = getOrders();
  const index = orders.findIndex((entry) => entry.orderId === orderId);
  if (index === -1) return null;

  const current = orders[index];
  const normalizedTransferId = String(transferId || current.wiseTransferId || "").trim() || undefined;

  if (terminalState === "COMPLETED") {
    if (current.status === "SETTLED" && current.escrowStatus === "SETTLED") {
      return current;
    }
    orders[index] = markSettled(
      {
        ...current,
        wiseTransferId: normalizedTransferId,
      },
      normalizedTransferId
    );
    writeStore("orders" as any, orders as any);
    return orders[index];
  }

  const reason = String(reasonCode || terminalState).trim();
  const note =
    terminalState === "FAILED"
      ? `Wise transfer failed (${reason})`
      : terminalState === "CANCELLED"
      ? `Wise transfer cancelled (${reason})`
      : `Wise transfer timed out (${reason}); manual review required before retry`;

  orders[index] = appendTimeline(
    {
      ...current,
      wiseTransferId: normalizedTransferId,
    },
    note
  );
  writeStore("orders" as any, orders as any);
  return orders[index];
}
