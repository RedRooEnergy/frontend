import "../../../../../lib/payments/bootstrap";

import { NextResponse } from "next/server";
import {
  acquirePaymentIdempotencyLock,
  buildScopedPaymentIdempotencyKey,
  markPaymentIdempotencyResult,
} from "../../../../../lib/payments/idempotencyStore";
import { logPaymentEvent } from "../../../../../lib/payments/logging";
import { recordRuntimeMetricEvent } from "../../../../../lib/payments/metrics/runtime";
import { mapStripeProviderError } from "../../../../../lib/payments/providerErrors";
import {
  buildCanonicalPricingSnapshot,
  computeCanonicalPricingSnapshotHash,
  sha256Hex,
  stableStringify,
  type CanonicalPricingSnapshotInput,
} from "../../../../../lib/payments/pricingSnapshot";
import { resolvePaymentsRuntimeConfig } from "../../../../../lib/payments/config";
import { getOrders, writeStore, type OrderRecord, type OrderStatus } from "../../../../../lib/store";

type CreateSessionBody = {
  orderId?: string;
  amount?: number;
  currency?: string;
  pricingSnapshotHash?: string;
  buyerEmail?: string;
};

type StripeSessionResponse = {
  url?: string;
  id?: string;
  payment_intent?: string | { id?: string };
  status?: string;
  currency?: string;
  amount_total?: number;
  metadata?: Record<string, unknown>;
};

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

function upsertOrder(orderId: string, apply: (order: OrderRecord) => OrderRecord) {
  const orders = getOrders();
  const index = orders.findIndex((entry) => entry.orderId === orderId);
  if (index === -1) {
    return null;
  }
  const next = apply(orders[index]);
  orders[index] = next;
  writeStore("orders" as any, orders as any);
  return next;
}

function appendTimeline(order: OrderRecord, note: string) {
  return {
    ...order,
    timeline: [
      ...(order.timeline || []),
      {
        status: "PAYMENT_INITIATED" as OrderStatus,
        timestamp: new Date().toISOString(),
        note,
      },
    ],
  } as OrderRecord;
}

function toMinorFromMajor(value: number) {
  return Math.round(Number(value || 0) * 100);
}

function durationMs(startUtc: string | null | undefined, endUtc: string | null | undefined): number | null {
  const start = Date.parse(String(startUtc || ""));
  const end = Date.parse(String(endUtc || ""));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return end - start;
}

function emitMetricsEvent(
  enabled: boolean,
  event: string,
  context: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info"
) {
  if (!enabled) return;
  recordRuntimeMetricEvent({
    metric: event,
    labels: context as Record<string, string | number | boolean | null | undefined>,
  });
  logPaymentEvent(level, event, context);
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

export async function POST(request: Request) {
  const runtimeConfig = resolvePaymentsRuntimeConfig();
  const hardenedEnabled = runtimeConfig.flags.stripeHardenedFlowEnabled;
  const metricsEnabled = runtimeConfig.flags.metricsEnabled;
  const secret = resolveStripeSecret();

  if (!secret) {
    return NextResponse.json({ error: "Stripe secret key not configured" }, { status: 500 });
  }

  const body = (await request.json()) as CreateSessionBody;
  const orderId = String(body?.orderId || "").trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const origin = request.headers.get("origin") || "http://localhost:3000";

  if (!hardenedEnabled) {
    const amount = Number(body?.amount || 0);
    const currency = String(body?.currency || "aud").trim().toLowerCase();
    const pricingSnapshotHash = String(body?.pricingSnapshotHash || "").trim();
    const buyerEmail = String(body?.buyerEmail || "").trim();

    if (!amount || amount <= 0 || !pricingSnapshotHash) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const form = new URLSearchParams();
    form.append("mode", "payment");
    form.append("success_url", `${origin}/checkout?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`);
    form.append("cancel_url", `${origin}/checkout?orderId=${orderId}&cancelled=1`);
    form.append("payment_method_types[0]", "card");
    form.append("line_items[0][price_data][currency]", currency);
    form.append("line_items[0][price_data][product_data][name]", `Order ${orderId}`);
    form.append("line_items[0][price_data][unit_amount]", Math.round(amount * 100).toString());
    form.append("line_items[0][quantity]", "1");
    form.append("metadata[orderId]", orderId);
    form.append("metadata[pricingSnapshotHash]", pricingSnapshotHash);
    if (buyerEmail) form.append("metadata[buyerEmail]", buyerEmail);

    try {
      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });

      if (!response.ok) {
        const errText = await response.text();
        const mapped = mapStripeProviderError(response.status, errText);
        logPaymentEvent("error", "payments_stripe_create_session_failed", {
          provider: "stripe",
          operation: "create_checkout_session",
          orderId,
          errorCode: mapped.code,
          providerStatus: mapped.providerStatus,
          providerCode: mapped.providerCode,
        });
        return NextResponse.json({ error: "Stripe session creation failed", code: mapped.code }, { status: mapped.httpStatus });
      }

      const session = (await response.json()) as StripeSessionResponse;
      return NextResponse.json({ url: session.url, id: session.id });
    } catch (err: any) {
      logPaymentEvent("error", "payments_stripe_create_session_exception", {
        provider: "stripe",
        operation: "create_checkout_session",
        orderId,
        errorMessage: err?.message || "Stripe error",
      });
      return NextResponse.json({ error: err?.message || "Stripe error" }, { status: 500 });
    }
  }

  const orders = getOrders();
  const order = orders.find((entry) => entry.orderId === orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const canonicalSnapshotInput = buildCanonicalSnapshotInputFromOrder(order);
  const canonicalSnapshot = buildCanonicalPricingSnapshot(canonicalSnapshotInput);
  if (!canonicalSnapshot.totalAmountMinor || canonicalSnapshot.totalAmountMinor <= 0) {
    return NextResponse.json({ error: "Order total must be greater than zero" }, { status: 400 });
  }

  const pricingSnapshotHashServer = computeCanonicalPricingSnapshotHash(canonicalSnapshotInput);
  const pricingSnapshotHashClient = String(body?.pricingSnapshotHash || "").trim();

  upsertOrder(orderId, (current) => ({
    ...current,
    pricingSnapshotHash: pricingSnapshotHashServer,
  }));

  if (pricingSnapshotHashClient && pricingSnapshotHashClient !== pricingSnapshotHashServer) {
    logPaymentEvent("warn", "payments_stripe_client_hash_non_authoritative", {
      provider: "stripe",
      operation: "create_checkout_session",
      orderId,
      clientHash: pricingSnapshotHashClient,
      serverHash: pricingSnapshotHashServer,
    });
  }

  const currency = String(canonicalSnapshot.currency || "AUD").trim().toLowerCase();
  const buyerEmail = String(order.buyerEmail || body?.buyerEmail || "").trim();
  const amountMinor = canonicalSnapshot.totalAmountMinor;

  const idempotencyKey = buildScopedPaymentIdempotencyKey({
    provider: "stripe",
    scope: "STRIPE_CHECKOUT_SESSION_CREATE",
    tenantId: null,
    orderId,
    operation: "create_checkout_session",
    referenceId: pricingSnapshotHashServer,
    attemptClass: "hardened_v1",
  });

  const requestHash = sha256Hex(
    stableStringify({
      orderId,
      amountMinor,
      currency,
      pricingSnapshotHashServer,
      canonicalSnapshot,
      buyerEmail,
    })
  );

  const lock = await acquirePaymentIdempotencyLock({
    provider: "stripe",
    scope: "STRIPE_CHECKOUT_SESSION_CREATE",
    key: idempotencyKey,
    operation: "create_checkout_session",
    requestHashSha256: requestHash,
    orderId,
    referenceId: pricingSnapshotHashServer,
    metadata: {
      mode: "hardened",
      pricingSnapshotHashServer,
      pricingSnapshotHashClient: pricingSnapshotHashClient || null,
    },
  });

  if (!lock.acquired) {
    const existing = lock.record;
    const metadata = (existing.metadata || {}) as Record<string, unknown>;

    if (existing.status === "SUCCEEDED") {
      emitMetricsEvent(
        metricsEnabled,
        "payments_metrics_idempotency_conflict",
        {
          provider: "stripe",
          scope: "STRIPE_CHECKOUT_SESSION_CREATE",
          conflictClass: "SUCCEEDED_REPLAY",
          orderId,
          idempotencyKey,
        },
        "info"
      );
      return NextResponse.json({
        url: metadata.stripeSessionUrl || null,
        id: metadata.stripeSessionId || null,
        pricingSnapshotHashServer,
        replayed: true,
      });
    }

    if (existing.status === "IN_PROGRESS") {
      emitMetricsEvent(
        metricsEnabled,
        "payments_metrics_idempotency_conflict",
        {
          provider: "stripe",
          scope: "STRIPE_CHECKOUT_SESSION_CREATE",
          conflictClass: "IN_PROGRESS",
          orderId,
          idempotencyKey,
        },
        "info"
      );
      return NextResponse.json(
        {
          status: "IN_PROGRESS",
          orderId,
          pricingSnapshotHashServer,
        },
        { status: 202 }
      );
    }

    emitMetricsEvent(
      metricsEnabled,
      "payments_metrics_idempotency_conflict",
      {
        provider: "stripe",
        scope: "STRIPE_CHECKOUT_SESSION_CREATE",
        conflictClass: "FAILED_CONFLICT",
        orderId,
        idempotencyKey,
      },
      "warn"
    );

    return NextResponse.json(
      {
        error: "Checkout session key previously failed",
        code: "PAYMENT_IDEMPOTENCY_PREVIOUS_FAILURE",
        orderId,
      },
      { status: 409 }
    );
  }

  const form = new URLSearchParams();
  form.append("mode", "payment");
  form.append("success_url", `${origin}/checkout?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`);
  form.append("cancel_url", `${origin}/checkout?orderId=${orderId}&cancelled=1`);
  form.append("payment_method_types[0]", "card");
  form.append("line_items[0][price_data][currency]", currency);
  form.append("line_items[0][price_data][product_data][name]", `Order ${orderId}`);
  form.append("line_items[0][price_data][unit_amount]", String(amountMinor));
  form.append("line_items[0][quantity]", "1");
  form.append("metadata[orderId]", orderId);
  form.append("metadata[pricingSnapshotHash]", pricingSnapshotHashServer);
  if (pricingSnapshotHashClient) {
    form.append("metadata[clientPricingSnapshotHash]", pricingSnapshotHashClient);
  }
  if (buyerEmail) {
    form.append("metadata[buyerEmail]", buyerEmail);
  }

  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": idempotencyKey,
      },
      body: form.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      const mapped = mapStripeProviderError(response.status, errText);
      const idempotencyResult = await markPaymentIdempotencyResult({
        provider: "stripe",
        scope: "STRIPE_CHECKOUT_SESSION_CREATE",
        key: idempotencyKey,
        status: "FAILED",
        responseHashSha256: sha256Hex(errText),
        metadata: {
          errorCode: mapped.code,
          providerStatus: mapped.providerStatus,
          providerCode: mapped.providerCode,
        },
      });
      const latency = durationMs(lock.record.createdAt, idempotencyResult.updatedAt);
      if (latency !== null) {
        emitMetricsEvent(
          metricsEnabled,
          "payments_metrics_provider_latency",
          {
            provider: "stripe",
            endpointClass: "stripe.checkout_session_create",
            scope: "STRIPE_CHECKOUT_SESSION_CREATE",
            outcome: "FAILED",
            orderId,
            idempotencyKey,
            durationMs: latency,
          },
          "info"
        );
      }

      logPaymentEvent("error", "payments_stripe_create_session_failed", {
        provider: "stripe",
        operation: "create_checkout_session",
        orderId,
        idempotencyKey,
        errorCode: mapped.code,
        providerStatus: mapped.providerStatus,
      });

      return NextResponse.json({ error: "Stripe session creation failed", code: mapped.code }, { status: mapped.httpStatus });
    }

    const session = (await response.json()) as StripeSessionResponse;
    const sessionId = String(session?.id || "").trim();

    const idempotencyResult = await markPaymentIdempotencyResult({
      provider: "stripe",
      scope: "STRIPE_CHECKOUT_SESSION_CREATE",
      key: idempotencyKey,
      status: "SUCCEEDED",
      responseHashSha256: sha256Hex(stableStringify(session || {})),
      metadata: {
        stripeSessionId: sessionId || null,
        stripeSessionUrl: session.url || null,
        pricingSnapshotHashServer,
      },
    });
    const latency = durationMs(lock.record.createdAt, idempotencyResult.updatedAt);
    if (latency !== null) {
      emitMetricsEvent(
        metricsEnabled,
        "payments_metrics_provider_latency",
        {
          provider: "stripe",
          endpointClass: "stripe.checkout_session_create",
          scope: "STRIPE_CHECKOUT_SESSION_CREATE",
          outcome: "SUCCEEDED",
          orderId,
          idempotencyKey,
          durationMs: latency,
        },
        "info"
      );
    }

    upsertOrder(orderId, (current) => {
      const next = {
        ...current,
        status: "PAYMENT_INITIATED" as const,
        pricingSnapshotHash: pricingSnapshotHashServer,
        stripeSessionId: sessionId || current.stripeSessionId,
        currency,
      };
      return appendTimeline(next, "Stripe checkout session created (server authoritative)");
    });

    return NextResponse.json({
      url: session.url,
      id: session.id,
      pricingSnapshotHashServer,
      replayed: false,
    });
  } catch (err: any) {
    const idempotencyResult = await markPaymentIdempotencyResult({
      provider: "stripe",
      scope: "STRIPE_CHECKOUT_SESSION_CREATE",
      key: idempotencyKey,
      status: "FAILED",
      responseHashSha256: sha256Hex(String(err?.message || "stripe_create_session_exception")),
      metadata: {
        errorCode: "PAYMENT_STRIPE_SESSION_EXCEPTION",
      },
    });
    const latency = durationMs(lock.record.createdAt, idempotencyResult.updatedAt);
    if (latency !== null) {
      emitMetricsEvent(
        metricsEnabled,
        "payments_metrics_provider_latency",
        {
          provider: "stripe",
          endpointClass: "stripe.checkout_session_create",
          scope: "STRIPE_CHECKOUT_SESSION_CREATE",
          outcome: "FAILED",
          orderId,
          idempotencyKey,
          durationMs: latency,
        },
        "info"
      );
    }

    logPaymentEvent("error", "payments_stripe_create_session_exception", {
      provider: "stripe",
      operation: "create_checkout_session",
      orderId,
      idempotencyKey,
      errorMessage: err?.message || "Stripe error",
    });

    return NextResponse.json({ error: err?.message || "Stripe error" }, { status: 500 });
  }
}
