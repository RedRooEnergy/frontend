import { OrderRecord } from "./store";

export type BuyerOrderStage = "Processing" | "In Transit" | "Customs" | "Out for Delivery" | "Delivered";

const STAGE_PROGRESS: Record<BuyerOrderStage, number> = {
  Processing: 20,
  "In Transit": 45,
  Customs: 65,
  "Out for Delivery": 85,
  Delivered: 100,
};

export function getBuyerOrderStage(order: OrderRecord): BuyerOrderStage {
  const timelineNotes = order.timeline?.map((entry) => entry.note?.toLowerCase() || "") || [];
  if (timelineNotes.some((note) => note.includes("customs"))) {
    return "Customs";
  }
  if (timelineNotes.some((note) => note.includes("last-mile") || note.includes("last mile"))) {
    return "Out for Delivery";
  }
  if (["DELIVERED", "SETTLED", "SETTLEMENT_ELIGIBLE"].includes(order.status)) {
    return "Delivered";
  }
  if (["SHIPPED"].includes(order.status)) {
    return "In Transit";
  }
  return "Processing";
}

export function getBuyerOrderProgress(order: OrderRecord): number {
  return STAGE_PROGRESS[getBuyerOrderStage(order)];
}

export function getDDPStatus(order: OrderRecord): string {
  if (order.shippingAddress && Object.keys(order.shippingAddress).length > 0) {
    return "DDP Managed";
  }
  return "Pending";
}

export function getOrderValue(order: OrderRecord): string {
  const currency = order.currency || "AUD";
  const amount = order.total.toFixed(2);
  return `${currency} ${amount}`;
}

export function getFreightStageLabel(order: OrderRecord): string {
  const stage = getBuyerOrderStage(order);
  switch (stage) {
    case "Processing":
      return "Origin";
    case "In Transit":
      return "Transit";
    case "Customs":
      return "Customs";
    case "Out for Delivery":
      return "Last-Mile";
    case "Delivered":
      return "Delivered";
    default:
      return "Origin";
  }
}

export function getOutstandingAction(order: OrderRecord): string | null {
  if (order.status === "DELIVERED" && !order.deliveredAt) {
    return "Confirm delivery";
  }
  if (order.status === "REFUND_REQUESTED") {
    return "Awaiting refund review";
  }
  return null;
}
