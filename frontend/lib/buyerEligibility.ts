import { getBuyers, getSession } from "./store";

export type BuyerEligibility = "NON_BUYER" | "BUYER_PENDING" | "BUYER_ACTIVE";

export function deriveBuyerEligibility(): BuyerEligibility {
  const session = getSession();
  if (!session || session.role !== "buyer") return "NON_BUYER";
  if (session.userId === "guest-buyer") return "NON_BUYER";

  const buyer = getBuyers().find((entry) => entry.buyerId === session.userId || entry.email === session.email);
  if (!buyer) return "NON_BUYER";

  const hasPhone = Boolean(buyer.phoneNumber || buyer.phone);
  const hasBuyerType = Boolean(buyer.buyerType);
  if (!hasPhone || !hasBuyerType) return "BUYER_PENDING";
  return "BUYER_ACTIVE";
}

export function canProceedCheckout() {
  return deriveBuyerEligibility() === "BUYER_ACTIVE";
}
