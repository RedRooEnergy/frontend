/**
 * COPIED VERBATIM (no logic changes) from:
 *   /Volumes/External RAM 1TB/REDROO_Projects_backend/src/routes/adminQueues.ts
 * Source baseline: e775498e68fd13947d387f59082aaa41e9b4f919
 */
import { Router } from "express";
import {
  QueueStatus,
  QueueType,
  listQueueItems,
  updateQueueStatus,
  getQueueItemById,
} from "../queue/adminQueueStore";
import { hasBlockingSettlementHold } from "../settlement/settlementHoldStore";
import { writeAudit } from "../audit/auditStore";

const router = Router();

function requireAdmin(headers: Record<string, string | string[] | undefined>) {
  const role = (headers["x-test-role"] || headers["x-role"]) as string | undefined;
  const userId = (headers["x-test-userid"] || headers["x-userid"]) as string | undefined;

  if (!role || !userId) {
    const error = new Error("UNAUTHORIZED");
    (error as any).status = 401;
    throw error;
  }

  if (role !== "admin") {
    const error = new Error("FORBIDDEN");
    (error as any).status = 403;
    throw error;
  }

  return { role, userId };
}

router.get("/", async (req, res, next) => {
  try {
    requireAdmin(req.headers as Record<string, string | string[] | undefined>);

    const queueType = (req.query.queueType as QueueType | undefined) || undefined;
    const status = (req.query.status as QueueStatus | undefined) || undefined;
    const assignedToUserId = (req.query.assignedToUserId as string | undefined) || undefined;
    const limitValue = req.query.limit as string | undefined;
    const limit = limitValue ? Number(limitValue) : undefined;

    const items = await listQueueItems({ queueType, status, assignedToUserId, limit });
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/queues/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const queueItem = await getQueueItemById(id);

    if (!queueItem) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.status(200).json({
      id: queueItem._id.toString(),
      status: queueItem.status,
      createdAt: queueItem.createdAt,
      updatedAt: queueItem.updatedAt,
      entityType: queueItem.entityType,
      entityId: queueItem.entityId,
    });
  } catch (err) {
    console.error("queue fetch error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

router.post("/", async (req, res, next) => {
  try {
    requireAdmin(req.headers as Record<string, string | string[] | undefined>);

    const {
      queueType,
      entityType,
      entityId,
      priority,
      riskScore,
      summary,
    } = req.body;

    if (!queueType || !entityType || !entityId) {
      const error = new Error("MISSING_REQUIRED_FIELDS");
      (error as any).status = 400;
      throw error;
    }

    const { createQueueItem } = await import("../queue/adminQueueStore");

    const id = await createQueueItem({
      queueType,
      entityType,
      entityId,
      priority: priority || "MEDIUM",
      riskScore: riskScore ?? 50,
      summary,
    });

    res.status(201).json({
      ok: true,
      entityId: id,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/", async (req, res, next) => {
  try {
    requireAdmin(req.headers as Record<string, string | string[] | undefined>);

    const { id, newStatus } = req.body as { id?: string; newStatus?: QueueStatus; };

    if (!id) {
      const error = new Error("MISSING_ID");
      (error as any).status = 400;
      throw error;
    }

    if (!newStatus) {
      const error = new Error("MISSING_NEW_STATUS");
      (error as any).status = 400;
      throw error;
    }

    // Hold enforcement: block terminal resolution if a hold exists
    const isTerminal = newStatus === "RESOLVED" || newStatus === "CLOSED";
    if (isTerminal) {
      const item = await getQueueItemById(id);
      if (!item) {
        const error = new Error("QUEUE_ITEM_NOT_FOUND");
        (error as any).status = 404;
        throw error;
      }

      const blocked = await hasBlockingSettlementHold(item.entityType, item.entityId);
      if (blocked) {
        const error = new Error("HOLD_ACTIVE");
        (error as any).status = 409;
        throw error;
      }
    }

    await updateQueueStatus(id, newStatus);

    const actorHeader = req.headers["x-test-userid"];
    const actorId = Array.isArray(actorHeader) ? actorHeader[0] : actorHeader || "unknown";
    await writeAudit({
      actorId,
      actorRole: "admin",
      action: "QUEUE_STATUS_UPDATED",
      entityType: "AdminQueueItem",
      entityId: id,
      metadata: { newStatus },
    });

    res.status(200).json({ ok: true, entityId: id });
  } catch (error) {
    next(error);
  }
});

export { router as adminQueuesRouter };
