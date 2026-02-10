"use client";

import Link from "next/link";
import { getBuyers, getSession } from "../../lib/store";

type BuyerEligibility = "NON_BUYER" | "BUYER_PENDING" | "BUYER_ACTIVE";

type BannerCopy = {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

function deriveBuyerEligibility(): BuyerEligibility {
  const session = getSession();
  if (!session || session.role !== "buyer") return "NON_BUYER";
  if (session.userId === "guest-buyer") return "NON_BUYER";
  const buyer = getBuyers().find((b) => b.buyerId === session.userId || b.email === session.email);
  if (!buyer) return "NON_BUYER";
  const hasPhone = Boolean(buyer.phoneNumber || buyer.phone);
  const hasBuyerType = Boolean(buyer.buyerType);
  if (!hasPhone || !hasBuyerType) return "BUYER_PENDING";
  return "BUYER_ACTIVE";
}

function getBannerCopy(state: BuyerEligibility): BannerCopy | null {
  if (state === "NON_BUYER") {
    return {
      title: "Checkout is locked",
      body: "Your account is not a buyer account yet. Create a buyer account to place orders.",
      ctaLabel: "Create Buyer Account",
      ctaHref: "/account/upgrade-to-buyer",
    };
  }
  if (state === "BUYER_PENDING") {
    return {
      title: "Complete your buyer profile",
      body: "Checkout is locked until your buyer profile is complete.",
      ctaLabel: "Complete Buyer Profile",
      ctaHref: "/buyer/profile",
    };
  }
  return null;
}

export default function CheckoutEligibilityBanner() {
  const eligibility = deriveBuyerEligibility();
  const copy = getBannerCopy(eligibility);
  if (!copy) return null;

  return (
    <div
      data-testid="checkout-eligibility-banner"
      className="bg-surface border border-brand-200 rounded-2xl shadow-card p-4 flex flex-col gap-2"
    >
      <div className="text-base font-semibold text-strong">{copy.title}</div>
      <p className="text-sm text-muted">{copy.body}</p>
      <div>
        <Link
          data-testid="checkout-eligibility-cta"
          href={copy.ctaHref}
          className="inline-flex items-center px-4 py-2 rounded-md bg-brand-700 text-brand-100 text-sm font-semibold"
        >
          {copy.ctaLabel}
        </Link>
      </div>
    </div>
  );
}
