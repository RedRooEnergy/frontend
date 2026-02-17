import { Router } from "express";
import { writeAudit } from "../audit/auditStore";
import { createCheckout, getCheckoutStatus } from "../payments/paymentsStore";

const router = Router();

function parseAmountAUD(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    const error = new Error("INVALID_AMOUNT_AUD");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  return num;
}

function parseMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    const error = new Error("INVALID_METADATA");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  return value as Record<string, unknown>;
}

router.post("/checkout", async (req, res, next) => {
  try {
    const {
      snapshotId,
      orderId,
      amountAUD,
      currency,
      provider,
      metadata,
    } = req.body as {
      snapshotId?: string;
      orderId?: string;
      amountAUD?: number;
      currency?: string;
      provider?: string;
      metadata?: unknown;
    };

    if (!snapshotId || String(snapshotId).trim().length === 0) {
      const error = new Error("MISSING_SNAPSHOT_ID");
      (error as Error & { status?: number }).status = 400;
      throw error;
    }

    const normalizedProvider = provider ? String(provider).trim().toUpperCase() : "TEST";
    if (normalizedProvider !== "TEST") {
      const error = new Error("INVALID_PROVIDER");
      (error as Error & { status?: number }).status = 400;
      throw error;
    }

    const normalizedCurrency = currency ? String(currency).trim().toUpperCase() : "AUD";
    const correlationIdHeader = req.headers["x-correlation-id"];
    const correlationId = Array.isArray(correlationIdHeader)
      ? correlationIdHeader[0]
      : correlationIdHeader;

    const checkout = await createCheckout({
      snapshotId: String(snapshotId),
      orderId: orderId ? String(orderId) : undefined,
      amountAUD: parseAmountAUD(amountAUD),
      currency: normalizedCurrency,
      correlationId: correlationId ? String(correlationId) : undefined,
      metadata: parseMetadata(metadata),
    });

    await writeAudit({
      actorId: "system",
      actorRole: "system",
      action: "PAYMENT_CHECKOUT_CREATED",
      entityType: "PaymentCheckout",
      entityId: checkout.paymentId,
      metadata: {
        provider: checkout.provider,
        status: checkout.status,
        snapshotId: checkout.snapshotId,
        orderId: checkout.orderId,
      },
    });

    res.status(201).json({
      ok: true,
      paymentId: checkout.paymentId,
      status: checkout.status,
      provider: checkout.provider,
      snapshotId: checkout.snapshotId,
      orderId: checkout.orderId,
      amountAUD: checkout.amountAUD,
      currency: checkout.currency,
      createdAt: checkout.createdAt,
      updatedAt: checkout.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/status/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const checkout = await getCheckoutStatus(id);

    if (!checkout) {
      const error = new Error("PAYMENT_NOT_FOUND");
      (error as Error & { status?: number }).status = 404;
      throw error;
    }

    res.status(200).json({
      paymentId: checkout.paymentId,
      status: checkout.status,
      provider: checkout.provider,
      snapshotId: checkout.snapshotId,
      orderId: checkout.orderId,
      amountAUD: checkout.amountAUD,
      currency: checkout.currency,
      createdAt: checkout.createdAt,
      updatedAt: checkout.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

export { router as paymentsCheckoutRouter };
export default router;
