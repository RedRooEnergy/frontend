import crypto from "crypto";
import type { PaymentLogLevel, PaymentProvider } from "./types";

type PaymentLogger = Pick<typeof console, "info" | "warn" | "error">;

export type PaymentLogContext = {
  correlationId?: string;
  provider?: PaymentProvider;
  operation?: string;
  orderId?: string | null;
  tenantId?: string | null;
  idempotencyKey?: string | null;
  [key: string]: unknown;
};

const defaultLogger: PaymentLogger = console;

export function createPaymentCorrelationId(prefix = "pay") {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function logPaymentEvent(
  level: PaymentLogLevel,
  event: string,
  context: PaymentLogContext,
  logger: PaymentLogger = defaultLogger
) {
  const payload = {
    ...context,
    event,
    atUtc: new Date().toISOString(),
  };

  if (level === "error") {
    logger.error(event, payload);
    return;
  }
  if (level === "warn") {
    logger.warn(event, payload);
    return;
  }
  logger.info(event, payload);
}
