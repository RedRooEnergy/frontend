/**
 * COPIED VERBATIM (no logic changes) from:
 *   /Volumes/External RAM 1TB/REDROO_Projects_backend/src/routes/settlementHolds.ts
 * Source baseline: e775498e68fd13947d387f59082aaa41e9b4f919
 */
import { Router } from "express";
import {
  createSettlementHold,
  listSettlementHolds,
  requestOverride,
} from "../settlement/settlementHoldStore";
import { writeAudit } from "../audit/auditStore";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const holds = await listSettlementHolds();
    res.status(200).json(holds);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { entityType, entityId, reason, createdBy } = req.body;

    if (!entityType || !entityId || !reason || !createdBy) {
      const error = new Error("MISSING_REQUIRED_FIELDS");
      (error as any).status = 400;
      throw error;
    }

    const id = await createSettlementHold({
      entityType,
      entityId,
      reason,
      createdBy,
    });

    await writeAudit({
      actorId: createdBy,
      actorRole: "admin",
      action: "SETTLEMENT_HOLD_CREATED",
      entityType: "SettlementHold",
      entityId: id,
      metadata: { entityType, entityId },
    });

    res.status(201).json({
      ok: true,
      holdId: id,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/override", async (req, res, next) => {
  try {
    const { approverId } = req.body;
    const { id } = req.params;

    if (!approverId) {
      const error = new Error("MISSING_APPROVER");
      (error as any).status = 400;
      throw error;
    }

    const result = await requestOverride(id, approverId);

    await writeAudit({
      actorId: approverId,
      actorRole: "admin",
      action: "SETTLEMENT_HOLD_OVERRIDE_APPROVAL",
      entityType: "SettlementHold",
      entityId: id,
      metadata: { status: result.status },
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export { router as settlementHoldsRouter };
