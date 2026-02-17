import { Router } from "express";
import { writeAudit } from "../audit/auditStore";
import { createQueuedEmail, listQueuedEmails } from "../email/emailQueueStore";

const router = Router();

function requireAdmin(headers: Record<string, string | string[] | undefined>) {
  const role = (headers["x-test-role"] || headers["x-role"]) as string | undefined;
  const userId = (headers["x-test-userid"] || headers["x-userid"]) as string | undefined;

  if (!role || !userId) {
    const error = new Error("UNAUTHORIZED");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  if (role !== "admin") {
    const error = new Error("FORBIDDEN");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }

  return { role, userId };
}

function parsePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

router.post("/preview-or-send", async (req, res, next) => {
  try {
    const { userId } = requireAdmin(req.headers as Record<string, string | string[] | undefined>);

    const {
      mode,
      templateKey,
      entityType,
      entityId,
      ...rest
    } = req.body as {
      mode?: unknown;
      templateKey?: unknown;
      entityType?: unknown;
      entityId?: unknown;
      [key: string]: unknown;
    };

    const normalizedMode = mode ? String(mode).trim() : "queue";
    const normalizedTemplateKey = templateKey ? String(templateKey).trim() : "";
    const normalizedEntityType = entityType ? String(entityType).trim() : "";
    const normalizedEntityId = entityId ? String(entityId).trim() : "";

    if (!normalizedTemplateKey || !normalizedEntityType || !normalizedEntityId) {
      const error = new Error("MISSING_REQUIRED_FIELDS");
      (error as Error & { status?: number }).status = 400;
      throw error;
    }

    const correlationHeader = req.headers["x-correlation-id"];
    const correlationId = Array.isArray(correlationHeader)
      ? correlationHeader[0]
      : correlationHeader || undefined;

    const queued = await createQueuedEmail({
      mode: normalizedMode,
      templateKey: normalizedTemplateKey,
      entityType: normalizedEntityType,
      entityId: normalizedEntityId,
      correlationId: correlationId ? String(correlationId) : undefined,
      payload: parsePayload(rest),
    });

    await writeAudit({
      actorId: userId,
      actorRole: "admin",
      action: "EMAIL_QUEUE_ITEM_CREATED",
      entityType: "EmailQueue",
      entityId: queued.emailId,
      metadata: {
        mode: queued.mode,
        templateKey: queued.templateKey,
        entityType: queued.entityType,
        entityId: queued.entityId,
      },
    });

    res.status(201).json({
      ok: true,
      emailId: queued.emailId,
      messageId: queued.emailId,
      status: queued.status,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/logs", async (req, res, next) => {
  try {
    requireAdmin(req.headers as Record<string, string | string[] | undefined>);

    const entityIdRaw = req.query.entityId;
    const entityId = typeof entityIdRaw === "string" ? entityIdRaw : undefined;

    const logs = await listQueuedEmails({ entityId });
    res.status(200).json({ logs });
  } catch (err) {
    next(err);
  }
});

export { router as emailRouter };
export default router;
