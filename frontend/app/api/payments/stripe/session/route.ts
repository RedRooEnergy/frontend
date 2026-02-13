import "../../../../../lib/payments/bootstrap";

import { NextResponse } from "next/server";
import { resolvePaymentsRuntimeConfig } from "../../../../../lib/payments/config";
import { logPaymentEvent } from "../../../../../lib/payments/logging";
import { mapStripeProviderError } from "../../../../../lib/payments/providerErrors";

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

export async function GET(request: Request) {
  const secret = resolveStripeSecret();
  if (!secret) {
    return NextResponse.json({ error: "Stripe secret key not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = String(searchParams.get("session_id") || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=payment_intent`, {
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      const mapped = mapStripeProviderError(response.status, errText);
      logPaymentEvent("error", "payments_stripe_session_fetch_failed", {
        provider: "stripe",
        operation: "fetch_checkout_session",
        stripeSessionId: sessionId,
        errorCode: mapped.code,
        providerStatus: mapped.providerStatus,
      });
      return NextResponse.json({ error: "Stripe error", code: mapped.code }, { status: mapped.httpStatus });
    }

    const session = (await response.json()) as any;
    return NextResponse.json({
      id: session.id,
      payment_intent: session.payment_intent?.id || session.payment_intent,
      amount_total: session.amount_total,
      currency: session.currency,
      status: session.status,
      metadata: session.metadata,
      serverAuthoritative: true,
    });
  } catch (err: any) {
    logPaymentEvent("error", "payments_stripe_session_fetch_exception", {
      provider: "stripe",
      operation: "fetch_checkout_session",
      stripeSessionId: sessionId,
      errorMessage: err?.message || "Stripe error",
    });
    return NextResponse.json({ error: err?.message || "Stripe error" }, { status: 500 });
  }
}
