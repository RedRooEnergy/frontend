import "../../../../../lib/payments/bootstrap";

import { NextResponse } from "next/server";
import { markRefunded } from "../../../../../lib/escrow";
import { appendPaymentProviderEvent, updatePaymentProviderEventStatus } from "../../../../../lib/payments/providerEventStore";
import { resolvePaymentsRuntimeConfig } from "../../../../../lib/payments/config";
import { logPaymentEvent } from "../../../../../lib/payments/logging";
import {
  buildCanonicalPricingSnapshot,
  computeCanonicalPricingSnapshotHash,
  sha256Hex,
  type CanonicalPricingSnapshotInput,
} from "../../../../../lib/payments/pricingSnapshot";
import { verifyStripeWebhookSignature } from "../../../../../lib/payments/stripeSecurity";
import { getOrders, writeStore, type OrderRecord } from "../../../../../lib/store";

const WEBHOOK_TOLERANCE_SECONDS = 300;

type StripeEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: any;
  };
  created?: number;
};

function resolveStripeWebhookSecret() {
  const runtimeConfig = resolvePaymentsRuntimeConfig();
  if (runtimeConfig.flags.stripeHardenedFlowEnabled && runtimeConfig.stripe?.webhookSecret) {
    return runtimeConfig.stripe.webhookSecret;
  }
  if (runtimeConfig.isProduction) {
    return process.env.STRIPE_WEBHOOK_SECRET_LIVE || "";
  }
  return process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET_LIVE || "";
}

function toMinorFromMajor(value: number) {
  return Math.round(Number(value || 0) * 100);
}

function buildCanonicalSnapshotInputFromOrder(order: OrderRecord): CanonicalPricingSnapshotInput {
  return {
    orderId: order.orderId,
    currency: String(order.currency || "AUD").toUpperCase(),
    totalAmountMinor: toMinorFromMajor(order.total),
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          productSlug: String(item?.productSlug || "").trim(),
          supplierId: String(item?.supplierId || "").trim(),
          qty: Number(item?.qty || 0),
          unitAmountMinor: toMinorFromMajor(Number(item?.price || 0)),
        }))
      : [],
  };
}

function toPaymentIntentId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return "";
}

function findOrderByPaymentIntent(paymentIntentId: string) {
  if (!paymentIntentId) return null;
  return getOrders().find((entry) => entry.stripePaymentIntentId === paymentIntentId) || null;
}

function extractOrderId(event: StripeEvent) {
  const obj = event?.data?.object;
  const metadataOrderId = String(obj?.metadata?.orderId || "").trim();
  if (metadataOrderId) return metadataOrderId;

  const paymentIntentId = toPaymentIntentId(obj?.payment_intent);
  const order = findOrderByPaymentIntent(paymentIntentId);
  return order?.orderId || "";
}

function applyCheckoutSessionCompleted(event: StripeEvent) {
  const session = event?.data?.object;
  const orderId = String(session?.metadata?.orderId || "").trim();
  if (!orderId) {
    return { orderId: "", transitionedTo: "NONE" as const, hashMatch: false };
  }

  const orders = getOrders();
  const index = orders.findIndex((entry) => entry.orderId === orderId);
  if (index === -1) {
    return { orderId, transitionedTo: "NONE" as const, hashMatch: false };
  }

  const order = orders[index];
  const canonicalSnapshotInput = buildCanonicalSnapshotInputFromOrder(order);
  const canonicalSnapshot = buildCanonicalPricingSnapshot(canonicalSnapshotInput);
  const canonicalHash = computeCanonicalPricingSnapshotHash(canonicalSnapshotInput);
  const incomingHash = String(session?.metadata?.pricingSnapshotHash || "").trim();
  const hashMatch = canonicalHash.length > 0 && incomingHash.length > 0 && canonicalHash === incomingHash;
  const transitionedTo = hashMatch ? "PAID" : "PAYMENT_REVIEW_REQUIRED";
  const paymentIntentId = toPaymentIntentId(session?.payment_intent);

  orders[index] = {
    ...order,
    pricingSnapshotHash: canonicalHash,
    status: transitionedTo,
    stripeSessionId: String(session?.id || order.stripeSessionId || "") || undefined,
    stripePaymentIntentId: paymentIntentId || order.stripePaymentIntentId,
    currency: String(session?.currency || canonicalSnapshot.currency || "AUD").toLowerCase(),
    escrowStatus: hashMatch ? "HELD" : order.escrowStatus,
    timeline: [
      ...(order.timeline || []),
      {
        status: transitionedTo,
        timestamp: new Date().toISOString(),
        note: hashMatch
          ? "Payment confirmed from verified Stripe webhook"
          : "Payment moved to review (pricing snapshot hash mismatch)",
      },
    ],
  };

  writeStore("orders" as any, orders as any);

  return {
    orderId,
    transitionedTo,
    hashMatch,
  };
}

function applyRefundFinalization(event: StripeEvent) {
  const refund = event?.data?.object;
  const paymentIntentId = toPaymentIntentId(refund?.payment_intent);
  const refundStatus = String(refund?.status || "").trim().toLowerCase();
  const eventType = String(event?.type || "").trim();

  const isFinalized = eventType === "charge.refunded" || refundStatus === "succeeded";
  if (!isFinalized) {
    return {
      orderId: findOrderByPaymentIntent(paymentIntentId)?.orderId || "",
      finalized: false,
      reason: "REFUND_STATUS_NOT_SUCCEEDED",
    };
  }

  const orders = getOrders();
  const index = orders.findIndex((entry) => entry.stripePaymentIntentId === paymentIntentId);
  if (index === -1) {
    return {
      orderId: "",
      finalized: false,
      reason: "ORDER_NOT_FOUND",
    };
  }

  orders[index] = markRefunded(orders[index], String(refund?.id || "").trim() || undefined);
  writeStore("orders" as any, orders as any);

  return {
    orderId: orders[index].orderId,
    finalized: true,
    reason: null,
  };
}

export async function POST(request: Request) {
  const runtimeConfig = resolvePaymentsRuntimeConfig();
  const hardenedEnabled = runtimeConfig.flags.stripeHardenedFlowEnabled;
  const webhookSecret = resolveStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    verifyStripeWebhookSignature(rawBody, signature, webhookSecret, {
      toleranceSeconds: WEBHOOK_TOLERANCE_SECONDS,
    });
  } catch (error: any) {
    logPaymentEvent("warn", "payments_stripe_webhook_signature_rejected", {
      provider: "stripe",
      operation: "webhook_verify",
      errorCode: String(error?.message || "STRIPE_WEBHOOK_SIGNATURE_INVALID"),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventId = String(event?.id || "").trim();
  const eventType = String(event?.type || "").trim();
  if (!eventId || !eventType) {
    return NextResponse.json({ error: "Invalid event envelope" }, { status: 400 });
  }

  const orderId = extractOrderId(event) || null;
  const paymentIntentId = toPaymentIntentId(event?.data?.object?.payment_intent) || null;

  const appended = await appendPaymentProviderEvent({
    provider: "stripe",
    eventId,
    eventType,
    receivedAt: new Date().toISOString(),
    occurredAt: event?.created ? new Date(event.created * 1000).toISOString() : null,
    tenantId: null,
    orderId,
    paymentIntentId,
    payloadHashSha256: sha256Hex(rawBody),
    payload: {
      id: eventId,
      type: eventType,
      created: event?.created || null,
      objectId: event?.data?.object?.id || null,
    },
  });

  if (!appended.created) {
    logPaymentEvent("info", "payments_stripe_webhook_duplicate_ignored", {
      provider: "stripe",
      operation: "webhook_event",
      orderId,
      eventId,
      eventType,
    });
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!hardenedEnabled) {
    await updatePaymentProviderEventStatus({
      provider: "stripe",
      eventId,
      status: "PROCESSED",
      metadata: {
        outcome: "LOG_ONLY_NON_HARDENED",
        eventType,
        orderId,
      },
    });

    return NextResponse.json({ received: true, mode: "log_only_non_hardened" });
  }

  try {
    let processingMetadata: Record<string, unknown> = {};

    switch (eventType) {
      case "checkout.session.completed": {
        const outcome = applyCheckoutSessionCompleted(event);
        processingMetadata = {
          outcome: "CHECKOUT_SESSION_COMPLETED",
          orderId: outcome.orderId || orderId,
          transitionedTo: outcome.transitionedTo,
          hashMatch: outcome.hashMatch,
        };

        if (!outcome.hashMatch && outcome.orderId) {
          logPaymentEvent("warn", "payments_stripe_pricing_snapshot_mismatch", {
            provider: "stripe",
            operation: "webhook_checkout_completed",
            orderId: outcome.orderId,
            eventId,
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        processingMetadata = {
          outcome: "PAYMENT_INTENT_SUCCEEDED",
          orderId,
        };
        break;
      }

      case "charge.refunded":
      case "refund.updated": {
        const outcome = applyRefundFinalization(event);
        processingMetadata = {
          outcome: "REFUND_FINALIZATION",
          orderId: outcome.orderId || orderId,
          finalized: outcome.finalized,
          reason: outcome.reason,
          eventType,
        };
        break;
      }

      default:
        processingMetadata = {
          outcome: "IGNORED_EVENT_TYPE",
          orderId,
          eventType,
        };
        break;
    }

    await updatePaymentProviderEventStatus({
      provider: "stripe",
      eventId,
      status: "PROCESSED",
      metadata: processingMetadata,
    });

    return NextResponse.json({ received: true });
  } catch (error: any) {
    await updatePaymentProviderEventStatus({
      provider: "stripe",
      eventId,
      status: "FAILED",
      errorCode: "PAYMENT_STRIPE_WEBHOOK_PROCESSING_FAILED",
      errorMessage: String(error?.message || "Stripe webhook processing failed"),
    });

    logPaymentEvent("error", "payments_stripe_webhook_processing_failed", {
      provider: "stripe",
      operation: "webhook_event",
      orderId,
      eventId,
      eventType,
      errorMessage: String(error?.message || "Stripe webhook processing failed"),
    });

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
