import "../../../../../lib/payments/bootstrap";

import { NextResponse } from "next/server";
import { getOrders, getSession, getAdminFlags, writeStore } from "../../../../../lib/store";
import { canRefund, markRefundRequested } from "../../../../../lib/escrow";
import { recordAudit } from "../../../../../lib/audit";
import { getTestSessionFromHeaders } from "../../../../../lib/testSession";
import { sendEmail } from "../../../../../lib/email/dispatchService";
import { resolvePaymentsRuntimeConfig } from "../../../../../lib/payments/config";
import { createQueueItem } from "../../../../../lib/adminDashboard/adminQueueStore";
import {
  acquirePaymentIdempotencyLock,
  buildScopedPaymentIdempotencyKey,
  markPaymentIdempotencyResult,
} from "../../../../../lib/payments/idempotencyStore";
import { logPaymentEvent } from "../../../../../lib/payments/logging";
import { mapStripeProviderError } from "../../../../../lib/payments/providerErrors";
import { sha256Hex, stableStringify } from "../../../../../lib/payments/pricingSnapshot";

function resolveStripeSecret() {
  const runtimeConfig = resolvePaymentsRuntimeConfig();
  if (runtimeConfig.flags.stripeHardenedFlowEnabled && runtimeConfig.stripe?.secretKey) {
    return runtimeConfig.stripe.secretKey;
  }
  if (runtimeConfig.isProduction) {
    return process.env.STRIPE_SECRET_KEY_LIVE || "";
  }
  return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY_LIVE || "";
}

export async function POST(request: Request) {
  const runtimeConfig = resolvePaymentsRuntimeConfig();
  const hardenedEnabled = runtimeConfig.flags.stripeHardenedFlowEnabled;
  const secret = resolveStripeSecret();
  if (!secret) {
    return NextResponse.json({ error: "Stripe secret key not configured" }, { status: 500 });
  }

  const testSession = getTestSessionFromHeaders(request.headers);
  const session = testSession || getSession();
  if (!session || session.role !== "buyer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, reason } = (await request.json()) as { orderId?: string; reason?: string };
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const orders = getOrders();
  const index = orders.findIndex((entry) => entry.orderId === orderId && entry.buyerEmail === session.email);
  if (index === -1) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const adminFlags = getAdminFlags();
  const order = orders[index];

  if (!canRefund(order, adminFlags.refundOverride === true)) {
    return NextResponse.json({ error: "Refund not eligible" }, { status: 400 });
  }

  if (!order.stripePaymentIntentId) {
    return NextResponse.json({ error: "No payment intent for refund" }, { status: 400 });
  }

  if (!hardenedEnabled) {
    orders[index] = markRefundRequested(order, reason);
    writeStore("orders" as any, orders as any);
    recordAudit("BUYER_REFUND_REQUESTED", { orderId });

    const form = new URLSearchParams();
    form.append("payment_intent", order.stripePaymentIntentId);
    form.append("reason", "requested_by_customer");

    try {
      const res = await fetch("https://api.stripe.com/v1/refunds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Stripe refund error", err);
        return NextResponse.json({ error: "Stripe refund failed" }, { status: 500 });
      }

      const refund = (await res.json()) as { id?: string };
      if (refund.id) {
        orders[index].refundId = refund.id;
        writeStore("orders" as any, orders as any);
        try {
          await createQueueItem({
            queueType: "REFUND_REQUEST",
            entityType: "Refund",
            entityId: refund.id,
            priority: "MEDIUM",
            riskScore: 50,
            summary: `Refund requested for order ${orderId}`,
            governanceRefs: {},
          });
        } catch (err) {
          console.error("QUEUE_INSERT_FAILURE", err);
          throw err;
        }
        recordAudit("STRIPE_REFUND_INITIATED", { orderId, refundId: refund.id });

        try {
          await sendEmail({
            eventCode: "REFUND_ISSUED",
            recipient: {
              userId: session.userId || session.email,
              email: session.email,
              role: "buyer",
              displayName: session.email,
            },
            entityRefs: {
              primaryId: orderId,
              orderId,
              buyerEmail: session.email,
              referenceUrl: `/dashboard/buyer/returns`,
              actionRequired: "No action required.",
            },
            variables: {
              referenceId: orderId,
            },
          });
        } catch (emailError) {
          console.error("Refund email failed", emailError);
        }
      }

      return NextResponse.json({ ok: true, refundId: refund.id });
    } catch (error: any) {
      console.error("Stripe refund exception", error);
      return NextResponse.json({ error: error?.message || "Stripe error" }, { status: 500 });
    }
  }

  const idempotencyKey = buildScopedPaymentIdempotencyKey({
    provider: "stripe",
    scope: "STRIPE_REFUND_CREATE",
    tenantId: null,
    orderId,
    operation: "create_refund_intent",
    referenceId: order.stripePaymentIntentId,
    attemptClass: "hardened_v1",
  });

  const requestHash = sha256Hex(
    stableStringify({
      orderId,
      paymentIntentId: order.stripePaymentIntentId,
      reason: String(reason || "Buyer requested refund"),
    })
  );

  const lock = await acquirePaymentIdempotencyLock({
    provider: "stripe",
    scope: "STRIPE_REFUND_CREATE",
    key: idempotencyKey,
    operation: "create_refund_intent",
    requestHashSha256: requestHash,
    orderId,
    referenceId: order.stripePaymentIntentId,
    metadata: {
      status: "REFUND_INTENT_REQUESTED",
    },
  });

  if (!lock.acquired) {
    if (lock.record.status === "SUCCEEDED") {
      return NextResponse.json({
        ok: true,
        replayed: true,
        refundIntentId: (lock.record.metadata as Record<string, unknown> | undefined)?.refundIntentId || null,
        status: "REFUND_REQUESTED",
      });
    }

    if (lock.record.status === "IN_PROGRESS") {
      return NextResponse.json({ status: "IN_PROGRESS", orderId }, { status: 202 });
    }

    return NextResponse.json(
      {
        error: "Refund intent key previously failed",
        code: "PAYMENT_IDEMPOTENCY_PREVIOUS_FAILURE",
      },
      { status: 409 }
    );
  }

  const form = new URLSearchParams();
  form.append("payment_intent", order.stripePaymentIntentId);
  form.append("reason", "requested_by_customer");

  try {
    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": idempotencyKey,
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      const mapped = mapStripeProviderError(res.status, errText);

      await markPaymentIdempotencyResult({
        provider: "stripe",
        scope: "STRIPE_REFUND_CREATE",
        key: idempotencyKey,
        status: "FAILED",
        responseHashSha256: sha256Hex(errText),
        metadata: {
          errorCode: mapped.code,
          providerStatus: mapped.providerStatus,
          providerCode: mapped.providerCode,
        },
      });

      logPaymentEvent("error", "payments_stripe_refund_intent_failed", {
        provider: "stripe",
        operation: "create_refund_intent",
        orderId,
        idempotencyKey,
        errorCode: mapped.code,
        providerStatus: mapped.providerStatus,
      });

      return NextResponse.json({ error: "Stripe refund failed", code: mapped.code }, { status: mapped.httpStatus });
    }

    const refund = (await res.json()) as { id?: string; status?: string };

    orders[index] = {
      ...markRefundRequested(order, reason || "Buyer requested refund"),
      refundId: refund.id || order.refundId,
    };
    writeStore("orders" as any, orders as any);
    try {
      await createQueueItem({
        queueType: "REFUND_REQUEST",
        entityType: "Refund",
        entityId: refund.id || orderId,
        priority: "MEDIUM",
        riskScore: 50,
        summary: `Refund requested for order ${orderId}`,
        governanceRefs: {},
      });
    } catch (err) {
      console.error("QUEUE_INSERT_FAILURE", err);
      throw err;
    }

    await markPaymentIdempotencyResult({
      provider: "stripe",
      scope: "STRIPE_REFUND_CREATE",
      key: idempotencyKey,
      status: "SUCCEEDED",
      responseHashSha256: sha256Hex(stableStringify(refund || {})),
      metadata: {
        refundIntentId: refund.id || null,
        refundIntentStatus: refund.status || null,
      },
    });

    recordAudit("STRIPE_REFUND_INITIATED", { orderId, refundId: refund.id || null, mode: "hardened_intent" });

    return NextResponse.json({
      ok: true,
      replayed: false,
      refundIntentId: refund.id || null,
      status: "REFUND_REQUESTED",
    });
  } catch (error: any) {
    await markPaymentIdempotencyResult({
      provider: "stripe",
      scope: "STRIPE_REFUND_CREATE",
      key: idempotencyKey,
      status: "FAILED",
      responseHashSha256: sha256Hex(String(error?.message || "stripe_refund_intent_exception")),
      metadata: {
        errorCode: "PAYMENT_STRIPE_REFUND_EXCEPTION",
      },
    });

    logPaymentEvent("error", "payments_stripe_refund_intent_exception", {
      provider: "stripe",
      operation: "create_refund_intent",
      orderId,
      idempotencyKey,
      errorMessage: error?.message || "Stripe error",
    });

    return NextResponse.json({ error: error?.message || "Stripe error" }, { status: 500 });
  }
}
