/**
 * COPIED VERBATIM (no logic changes) from:
 *   /Volumes/External RAM 1TB/REDROO_Projects_backend/src/routes/refunds.ts
 * Source baseline: e775498e68fd13947d387f59082aaa41e9b4f919
 */
import { Router } from "express";
import { createRefundRequest, attachQueueItem } from "../refunds/refundStore";
import { createQueueItem } from "../queue/adminQueueStore";
import { writeAudit } from "../audit/auditStore";

const router = Router();

router.post("/request", async (req, res, next) => {
  try {
    const { orderId, buyerUserId, buyerEmail, reason } = req.body;

    if (!orderId || !buyerUserId || !buyerEmail || !reason) {
      const error = new Error("MISSING_REQUIRED_FIELDS");
      (error as any).status = 400;
      throw error;
    }

    const refundRequestId = await createRefundRequest({
      orderId,
      buyerUserId,
      buyerEmail,
      reason,
    });

    await writeAudit({
      actorId: buyerUserId,
      actorRole: "buyer",
      action: "REFUND_REQUEST_CREATED",
      entityType: "Refund",
      entityId: refundRequestId,
      metadata: { orderId },
    });

    const queueItemId = await createQueueItem({
      queueType: "REFUND_REQUEST",
      entityType: "Refund",
      entityId: refundRequestId,
      priority: "MEDIUM",
      riskScore: 50,
      summary: `Refund requested for order ${orderId}`,
    });

    await writeAudit({
      actorId: "system",
      actorRole: "system",
      action: "QUEUE_ITEM_CREATED",
      entityType: "AdminQueueItem",
      entityId: queueItemId,
      metadata: { refundRequestId },
    });

    await attachQueueItem(refundRequestId, queueItemId);

    res.status(201).json({
      ok: true,
      refundRequestId,
      queueItemId,
    });
  } catch (err) {
    next(err);
  }
});

export { router as refundsRouter };
