import { OrderRecord, OrderStatus } from "./store";

export type EscrowComputation = {
  amount: number;
  currency: string;
  escrowStatus: OrderRecord["escrowStatus"];
};

export function computeEscrowForOrder(order: OrderRecord): EscrowComputation {
  return {
    amount: order.total,
    currency: (order.currency || "aud").toLowerCase(),
    escrowStatus: order.escrowStatus ?? "HELD",
  };
}

export function canSettle(order: OrderRecord, adminOverrideEligible = false) {
  const delivered = order.status === "DELIVERED" || order.status === "SETTLEMENT_ELIGIBLE";
  const returnWindowExpired = true; // placeholder; extend when delivery dates are tracked
  return (delivered && returnWindowExpired) || adminOverrideEligible;
}

export function canRefund(order: OrderRecord, adminOverrideRefund = false) {
  const refundableStatuses: OrderStatus[] = ["PAID", "PAYMENT_REVIEW_REQUIRED", "SETTLEMENT_ELIGIBLE"];
  if (adminOverrideRefund) return true;
  if (!refundableStatuses.includes(order.status as OrderStatus)) return false;
  if (order.escrowStatus === "SETTLED") return false;
  return true;
}

export function applyEscrowHold(order: OrderRecord, paymentIntentId: string, amount: number, currency: string) {
  return {
    ...order,
    stripePaymentIntentId: paymentIntentId,
    escrowStatus: "HELD" as const,
    currency: currency.toLowerCase(),
    timeline: [
      ...(order.timeline || []),
      {
        status: "PAID",
        timestamp: new Date().toISOString(),
        note: "Payment confirmed (escrow hold, test mode)",
      },
    ],
  };
}

export function applySettlementEligible(order: OrderRecord) {
  if (order.status === "SETTLEMENT_ELIGIBLE") return order;
  return {
    ...order,
    status: "SETTLEMENT_ELIGIBLE" as const,
    timeline: [
      ...(order.timeline || []),
      {
        status: "SETTLEMENT_ELIGIBLE",
        timestamp: new Date().toISOString(),
        note: "Eligible for settlement (return window passed or admin override)",
      },
    ],
  };
}

export function markSettlementInitiated(order: OrderRecord) {
  return {
    ...order,
    status: "SETTLEMENT_ELIGIBLE" as const,
    timeline: [
      ...(order.timeline || []),
      {
        status: "SETTLEMENT_ELIGIBLE" as OrderStatus,
        timestamp: new Date().toISOString(),
        note: "Settlement initiation started (sandbox)",
      },
    ],
  };
}

export function markSettled(order: OrderRecord, transferId?: string) {
  return {
    ...order,
    status: "SETTLED" as const,
    escrowStatus: "SETTLED" as const,
    timeline: [
      ...(order.timeline || []),
      {
        status: "SETTLED" as OrderStatus,
        timestamp: new Date().toISOString(),
        note: transferId ? `Settled via Wise transfer ${transferId}` : "Settled (sandbox)",
      },
    ],
  };
}

export function markRefundRequested(order: OrderRecord, reason?: string) {
  return {
    ...order,
    status: "REFUND_REQUESTED" as const,
    timeline: [
      ...(order.timeline || []),
      {
        status: "REFUND_REQUESTED" as OrderStatus,
        timestamp: new Date().toISOString(),
        note: reason || "Refund requested",
      },
    ],
  };
}

export function markRefunded(order: OrderRecord, refundId?: string) {
  return {
    ...order,
    status: "REFUNDED" as const,
    refundId: refundId ?? order.refundId,
    escrowStatus: "RELEASED" as const,
    timeline: [
      ...(order.timeline || []),
      {
        status: "REFUNDED" as OrderStatus,
        timestamp: new Date().toISOString(),
        note: "Refund processed via original payment method (test mode)",
      },
    ],
  };
}
