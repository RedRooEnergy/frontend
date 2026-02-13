export type PaymentProviderErrorClass =
  | "AUTH"
  | "RATE_LIMIT"
  | "VALIDATION"
  | "CONFLICT"
  | "TRANSIENT"
  | "UPSTREAM"
  | "UNKNOWN";

export type StripeProviderError = {
  provider: "stripe";
  code: string;
  class: PaymentProviderErrorClass;
  retryable: boolean;
  httpStatus: number;
  providerStatus?: number;
  providerType?: string;
  providerCode?: string;
  message?: string;
};

function parseStripeErrorBody(input: string) {
  try {
    const parsed = JSON.parse(input);
    const err = parsed?.error || {};
    return {
      message: typeof err?.message === "string" ? err.message : "",
      providerType: typeof err?.type === "string" ? err.type : "",
      providerCode: typeof err?.code === "string" ? err.code : "",
      status: typeof err?.status === "number" ? err.status : undefined,
    };
  } catch {
    return {
      message: "",
      providerType: "",
      providerCode: "",
      status: undefined,
    };
  }
}

export function mapStripeProviderError(providerStatus: number | undefined, rawBody: string | undefined): StripeProviderError {
  const details = parseStripeErrorBody(String(rawBody || ""));
  const status = Number(providerStatus || details.status || 500);

  if (status === 401 || status === 403) {
    return {
      provider: "stripe",
      code: "PAYMENT_STRIPE_AUTH_FAILED",
      class: "AUTH",
      retryable: false,
      httpStatus: 502,
      providerStatus: status,
      providerType: details.providerType || undefined,
      providerCode: details.providerCode || undefined,
      message: details.message || "Stripe authentication failed",
    };
  }

  if (status === 400 || status === 422) {
    return {
      provider: "stripe",
      code: "PAYMENT_STRIPE_VALIDATION_FAILED",
      class: "VALIDATION",
      retryable: false,
      httpStatus: 400,
      providerStatus: status,
      providerType: details.providerType || undefined,
      providerCode: details.providerCode || undefined,
      message: details.message || "Stripe request validation failed",
    };
  }

  if (status === 409) {
    return {
      provider: "stripe",
      code: "PAYMENT_STRIPE_CONFLICT",
      class: "CONFLICT",
      retryable: false,
      httpStatus: 409,
      providerStatus: status,
      providerType: details.providerType || undefined,
      providerCode: details.providerCode || undefined,
      message: details.message || "Stripe conflict",
    };
  }

  if (status === 429) {
    return {
      provider: "stripe",
      code: "PAYMENT_STRIPE_RATE_LIMITED",
      class: "RATE_LIMIT",
      retryable: true,
      httpStatus: 503,
      providerStatus: status,
      providerType: details.providerType || undefined,
      providerCode: details.providerCode || undefined,
      message: details.message || "Stripe rate limited",
    };
  }

  if (status >= 500) {
    return {
      provider: "stripe",
      code: "PAYMENT_STRIPE_UPSTREAM_FAILURE",
      class: "UPSTREAM",
      retryable: true,
      httpStatus: 502,
      providerStatus: status,
      providerType: details.providerType || undefined,
      providerCode: details.providerCode || undefined,
      message: details.message || "Stripe upstream error",
    };
  }

  return {
    provider: "stripe",
    code: "PAYMENT_STRIPE_UNKNOWN_ERROR",
    class: "UNKNOWN",
    retryable: false,
    httpStatus: 500,
    providerStatus: status,
    providerType: details.providerType || undefined,
    providerCode: details.providerCode || undefined,
    message: details.message || "Stripe error",
  };
}
