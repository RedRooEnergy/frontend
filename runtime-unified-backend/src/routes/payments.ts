import { Router } from "express";
import { writeAudit } from "../audit/auditStore";
import { createPaymentCheckout, getPaymentStatusById } from "../payments/paymentStore";

const router = Router();

router.post("/checkout", async (req, res, next) => {
  try {
    const { snapshotId, orderId } = req.body as {
      snapshotId?: string;
      orderId?: string;
    };

    if (!snapshotId || String(snapshotId).trim().length === 0) {
      const error = new Error("MISSING_SNAPSHOT_ID");
      (error as Error & { status?: number }).status = 400;
      throw error;
    }

    const correlationIdHeader = req.headers["x-correlation-id"];
    const correlationId = Array.isArray(correlationIdHeader)
      ? correlationIdHeader[0]
      : correlationIdHeader;

    const created = await createPaymentCheckout({
      snapshotId: String(snapshotId),
      orderId: orderId ? String(orderId) : undefined,
      correlationId: correlationId ? String(correlationId) : undefined,
    });

    await writeAudit({
      actorId: "system",
      actorRole: "system",
      action: "PAYMENT_CHECKOUT_CREATED_TESTMODE",
      entityType: "Payment",
      entityId: created.paymentId,
      metadata: {
        snapshotId: String(snapshotId),
        orderId: orderId ? String(orderId) : null,
        provider: created.provider,
      },
    });

    res.status(201).json({
      ok: true,
      paymentId: created.paymentId,
      paymentStatus: created.status,
      status: created.status,
      provider: created.provider,
      snapshotId: String(snapshotId),
      orderId: orderId ? String(orderId) : null,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/status/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await getPaymentStatusById(id);

    if (!payment) {
      const error = new Error("PAYMENT_NOT_FOUND");
      (error as Error & { status?: number }).status = 404;
      throw error;
    }

    res.status(200).json({
      paymentId: payment._id,
      status: payment.status,
      paymentStatus: payment.status,
      provider: payment.provider,
      snapshotId: payment.snapshotId,
      orderId: payment.orderId || null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

export { router as paymentsRouter };
