import { Router } from "express";
import { writeAudit } from "../audit/auditStore";
import { createCheckoutSession, getSnapshotById } from "../pricing/pricingStore";

const router = Router();

function withStatus(code: number, message: string) {
  const err = new Error(message);
  (err as Error & { status?: number }).status = code;
  return err;
}

router.post("/checkout/session", async (req, res, next) => {
  try {
    const { items, currency, metadata } = req.body as {
      items?: unknown;
      currency?: unknown;
      metadata?: unknown;
    };

    const created = await createCheckoutSession({ items, currency, metadata });

    await writeAudit({
      actorId: "system",
      actorRole: "system",
      action: "PRICING_SNAPSHOT_CREATED",
      entityType: "PricingSnapshot",
      entityId: created.snapshotId,
      metadata: {
        snapshotHash: created.snapshotHash,
        currency: created.currency,
        totalAUD: created.totalAUD,
        itemCount: created.items.length,
      },
    });

    res.status(201).json({
      ok: true,
      snapshotId: created.snapshotId,
      snapshotHash: created.snapshotHash,
      currency: created.currency,
      subtotalAUD: created.subtotalAUD,
      totalAUD: created.totalAUD,
      items: created.items,
      createdAt: created.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/pricing/snapshots/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const snap = await getSnapshotById(String(id));

    if (!snap) throw withStatus(404, "PRICING_SNAPSHOT_NOT_FOUND");

    res.status(200).json({
      snapshotId: snap.snapshotId,
      snapshotHash: snap.snapshotHash,
      currency: snap.currency,
      subtotalAUD: snap.subtotalAUD,
      totalAUD: snap.totalAUD,
      items: snap.items,
      createdAt: snap.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

export { router as pricingRouter };
export default router;
