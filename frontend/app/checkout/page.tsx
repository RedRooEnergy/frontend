"use client";
import { Suspense, useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { addOrder, clearCart, getBuyers, getCart, getOrders, getSession, updateBuyer, writeStore } from "../../lib/store";
import { recordAudit } from "../../lib/audit";
import CheckoutEligibilityBanner from "../../components/buyer/CheckoutEligibilityBanner";
import { deriveBuyerEligibility, type BuyerEligibility } from "../../lib/buyerEligibility";

function computeSnapshotHash(input: string) {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

const BUYER_TERMS_VERSION = "v1.0";
const BUYER_TERMS_ROUTE = "/core-legal-consumer/buyer-terms";
const STRIPE_HARDENED_CLIENT_MODE = process.env.NEXT_PUBLIC_ENABLE_STRIPE_HARDENED_FLOW === "true";

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const orderIdParam = params.get("orderId") || "";
  const installerIdParam = params.get("installerId") || params.get("installer") || "";
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState({ line1: "", city: "", state: "", postcode: "" });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsLocked, setTermsLocked] = useState(false);
  const [eligibility, setEligibility] = useState<BuyerEligibility>("NON_BUYER");
  const [cartItems, setCartItems] = useState(() => getCart());

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const checkoutLocked = eligibility !== "BUYER_ACTIVE";

  useEffect(() => {
    const refreshCheckoutContext = () => {
      const session = getSession();
      const liveEligibility = deriveBuyerEligibility();
      const liveCart = getCart();

      setEligibility(liveEligibility);
      setCartItems(liveCart);

      if (session?.email) {
        setEmail(session.email);
      }

      if (!session || session.role !== "buyer") {
        setTermsAccepted(false);
        setTermsLocked(false);
        return;
      }

      const buyer = getBuyers().find((entry) => entry.buyerId === session.userId || entry.email === session.email);
      const accepted = Boolean(buyer?.buyerTermsAccepted);
      setTermsAccepted(accepted);
      setTermsLocked(accepted);
    };

    refreshCheckoutContext();
    const timer = window.setTimeout(refreshCheckoutContext, 150);
    return () => window.clearTimeout(timer);
  }, []);

  const persistTermsAcknowledgement = () => {
    const session = getSession();
    if (!session || session.role !== "buyer") return false;
    const buyer = getBuyers().find((entry) => entry.buyerId === session.userId || entry.email === session.email);
    if (!buyer) return false;

    const acceptedAt = new Date().toISOString();
    updateBuyer(buyer.email, {
      buyerTermsAccepted: true,
      buyerTermsAcceptedAt: acceptedAt,
      buyerTermsVersion: BUYER_TERMS_VERSION,
    });
    setTermsAccepted(true);
    setTermsLocked(true);
    recordAudit("BUYER_TERMS_ACKNOWLEDGED", {
      buyerEmail: buyer.email,
      version: BUYER_TERMS_VERSION,
      acceptedAt,
    });
    return true;
  };

  // mark order paid when returning from Stripe
  useEffect(() => {
    if (STRIPE_HARDENED_CLIENT_MODE) {
      return;
    }

    const markPaid = async () => {
      if (!sessionId || !orderIdParam) return;
      try {
        const res = await fetch(`/api/payments/stripe/session?session_id=${sessionId}`);
        const data = await res.json();
        const orders = getOrders();
        const idx = orders.findIndex((o) => o.orderId === orderIdParam);
        if (idx !== -1) {
          const pricingHash = orders[idx].pricingSnapshotHash;
          const metadataHash = data?.metadata?.pricingSnapshotHash;
          const hashMatch = pricingHash && metadataHash && pricingHash === metadataHash;
          const newStatus = hashMatch ? "PAID" : "PAYMENT_REVIEW_REQUIRED";
          orders[idx] = {
            ...orders[idx],
            status: newStatus,
            stripeSessionId: data.id,
            stripePaymentIntentId: data.payment_intent ?? undefined,
            currency: data.currency ?? "aud",
            escrowStatus: hashMatch ? "HELD" : orders[idx].escrowStatus,
            timeline: [
              ...(orders[idx].timeline || []),
              {
                status: hashMatch ? "PAID" : "PAYMENT_REVIEW_REQUIRED",
                timestamp: new Date().toISOString(),
                note: hashMatch ? "Payment confirmed (test mode)" : "Payment requires review (hash mismatch)",
              },
            ],
          };
          writeStore("orders" as any, orders as any);
          recordAudit("BUYER_PAYMENT_SUCCEEDED", { orderId: orderIdParam, sessionId, hashMatch });

          if (hashMatch && orders[idx].installerAttribution?.installerId) {
            try {
              await fetch("/api/internal/fee-engine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  triggerEvent: "ORDER_PAID",
                  orderId: orders[idx].orderId,
                  installerId: orders[idx].installerAttribution.installerId,
                  baseAmount: orders[idx].total,
                  currency: (orders[idx].currency || "AUD").toUpperCase(),
                }),
              });
            } catch (e) {
              console.error("Failed to emit installer order service fee", e);
            }
          }

          if (hashMatch) {
            const supplierIds = Array.from(
              new Set(orders[idx].items.map((item) => item.supplierId).filter(Boolean) as string[])
            );
            fetch("/api/payments/notify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: orders[idx].orderId,
                buyerEmail: orders[idx].buyerEmail,
                supplierIds,
                event: "PAYMENT_CAPTURED",
              }),
            }).catch((err) => console.error("Payment email notify failed", err));
          }
        }
      } catch (e) {
        console.error("Failed to confirm payment", e);
      }
    };
    markPaid();
  }, [sessionId, orderIdParam]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (checkoutLocked) {
      setCheckoutError("Checkout remains locked until your buyer profile is complete.");
      recordAudit("BUYER_CHECKOUT_BLOCKED", { reason: eligibility });
      return;
    }
    if (!termsAccepted) {
      setCheckoutError("Buyer Terms acknowledgement is required before checkout.");
      recordAudit("BUYER_TERMS_ACK_REQUIRED", { reason: "MISSING_BUYER_TERMS_ACKNOWLEDGEMENT" });
      return;
    }
    const liveCartItems = getCart();
    if (liveCartItems.length === 0) {
      setCheckoutError("Your cart is empty. Add at least one item before placing an order.");
      recordAudit("BUYER_ORDER_BLOCKED_EMPTY_CART", {});
      return;
    }
    setCheckoutError("");
    const liveCartTotal = liveCartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const orderId = orderIdParam || crypto.randomUUID();
    const pricingSnapshotHash = computeSnapshotHash(
      JSON.stringify({ items: liveCartItems, total: liveCartTotal, currency: "aud" })
    );
    const supplierIds = Array.from(
      new Set(liveCartItems.map((item) => item.supplierId).filter(Boolean) as string[])
    );
    addOrder({
      orderId,
      createdAt: new Date().toISOString(),
      buyerEmail: email,
      shippingAddress: address,
      deliveryNotes: notes,
      items: liveCartItems,
      total: liveCartTotal,
      status: "PENDING",
      currency: "aud",
      pricingSnapshotHash,
      timeline: [{ status: "PENDING", timestamp: new Date().toISOString() }],
      installerAttribution: installerIdParam
        ? { installerId: installerIdParam, source: "RRE_INSTALLER_CHANNEL", assignedAt: new Date().toISOString() }
        : undefined,
      supplierIds,
    });
    clearCart();
    setCartItems([]);
    fetch("/api/orders/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, buyerEmail: email, supplierIds }),
    }).catch((err) => console.error("Order email notify failed", err));
    router.replace(`/checkout?orderId=${orderId}`);
  };

  const startPayment = async () => {
    if (!orderIdParam) return;
    const orders = getOrders();
    const order = orders.find((o) => o.orderId === orderIdParam);
    if (!order) return;
    setLoading(true);
    recordAudit("BUYER_PAYMENT_STARTED", { orderId: order.orderId });
    const pricingSnapshotHash =
      order.pricingSnapshotHash ||
      computeSnapshotHash(JSON.stringify({ items: order.items, total: order.total, currency: order.currency || "aud" }));
    const res = await fetch("/api/payments/stripe/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.orderId,
        amount: order.total,
        currency: order.currency || "aud",
        pricingSnapshotHash,
        buyerEmail: order.buyerEmail,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.url) {
      order.status = "PAYMENT_INITIATED";
      writeStore("orders" as any, orders as any);
      window.location.href = data.url as string;
    } else {
      alert("Failed to start payment");
    }
  };

  const existingOrder = orderIdParam ? getOrders().find((o) => o.orderId === orderIdParam) : undefined;

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <CheckoutEligibilityBanner />
        {!existingOrder ? (
          <form onSubmit={handleSubmit} className="bg-surface rounded-2xl shadow-card border p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Contact email
              </label>
              <input
                id="email"
                type="email"
                className="w-full border rounded-md px-3 py-2"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Shipping address</label>
              <input
                type="text"
                placeholder="Street address"
                className="w-full border rounded-md px-3 py-2"
                required
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  className="w-full border rounded-md px-3 py-2"
                  required
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="State"
                  className="w-full border rounded-md px-3 py-2"
                  required
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Postcode"
                  className="w-full border rounded-md px-3 py-2"
                  required
                  value={address.postcode}
                  onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="notes">
                Delivery notes (optional)
              </label>
              <textarea
                id="notes"
                className="w-full border rounded-md px-3 py-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="space-y-2 rounded-md border px-3 py-3">
              <label htmlFor="buyer-terms-ack" className="flex items-start gap-2 text-sm">
                <input
                  id="buyer-terms-ack"
                  type="checkbox"
                  checked={termsAccepted}
                  disabled={termsLocked}
                  onChange={(e) => {
                    if (termsLocked) return;
                    if (!e.target.checked) {
                      setTermsAccepted(false);
                      return;
                    }
                    const persisted = persistTermsAcknowledgement();
                    if (!persisted) {
                      setCheckoutError("Unable to persist Buyer Terms acknowledgement for this account.");
                      setTermsAccepted(false);
                      setTermsLocked(false);
                      return;
                    }
                    setCheckoutError("");
                  }}
                />
                <span>
                  I acknowledge and accept the{" "}
                  <Link href={BUYER_TERMS_ROUTE} className="font-semibold text-brand-700 underline">
                    Buyer Terms
                  </Link>
                  .
                </span>
              </label>
              <p className="text-xs text-muted">
                {termsLocked
                  ? "Buyer Terms acknowledgement has been recorded for this account."
                  : "Buyer Terms acknowledgement is required before order submission."}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Total: ${cartTotal.toFixed(2)}</div>
              <button
                type="submit"
                disabled={checkoutLocked || !termsAccepted}
                className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Place Order
              </button>
            </div>
            {checkoutError && <p className="text-sm text-amber-700">{checkoutError}</p>}
          </form>
        ) : (
          <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-3">
            <div className="text-sm text-muted">Order</div>
            <div className="text-base font-semibold">{existingOrder.orderId}</div>
            <div className="text-sm text-muted">Amount</div>
            <div className="text-base font-semibold">
              ${existingOrder.total.toFixed(2)} {existingOrder.currency?.toUpperCase() || "AUD"}
            </div>
            <button
              onClick={startPayment}
              className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold"
              disabled={loading}
            >
              {loading ? "Starting..." : "Pay with Stripe (Test)"}
            </button>
            {params.get("cancelled") && <p className="text-sm text-red-600">Payment cancelled.</p>}
            {sessionId && <p className="text-sm text-brand-700">Payment confirmed via Stripe.</p>}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-muted" />}>
      <CheckoutInner />
    </Suspense>
  );
}
