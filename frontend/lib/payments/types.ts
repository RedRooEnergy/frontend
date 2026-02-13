export type PaymentProvider = "stripe" | "wise";
export type PaymentEnvironment = "test" | "live";

export type PaymentIdempotencyScope =
  | "STRIPE_CHECKOUT_SESSION_CREATE"
  | "STRIPE_REFUND_CREATE"
  | "STRIPE_WEBHOOK_EVENT"
  | "WISE_TRANSFER_CREATE"
  | "WISE_WEBHOOK_EVENT"
  | "PAYMENT_INTERNAL";

export type PaymentIdempotencyStatus = "IN_PROGRESS" | "SUCCEEDED" | "FAILED";

export type PaymentProviderEventStatus = "RECEIVED" | "PROCESSED" | "FAILED" | "IGNORED_DUPLICATE";

export type PaymentLogLevel = "info" | "warn" | "error";

export type PaymentIdempotencyRecord = {
  _id?: string;
  provider: PaymentProvider;
  scope: PaymentIdempotencyScope;
  key: string;
  operation: string;
  status: PaymentIdempotencyStatus;
  requestHashSha256?: string | null;
  responseHashSha256?: string | null;
  tenantId?: string | null;
  orderId?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentProviderEventRecord = {
  _id?: string;
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  receivedAt: string;
  occurredAt?: string | null;
  status: PaymentProviderEventStatus;
  tenantId?: string | null;
  orderId?: string | null;
  paymentIntentId?: string | null;
  transferId?: string | null;
  payloadHashSha256?: string | null;
  payload?: Record<string, unknown>;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
