import { Router } from "express";
import { createSupplierDraft } from "../store/supplier-draft-store";
import { emitAuditEvent } from "../../../../core/platform/src/audit/audit-logger";
import { authorizeSupplierAction } from "../auth/authorize-supplier";

export function buildCreateDraftRouter(): Router {
  const router = Router();

  router.post("/drafts/:supplierId", (req, res) => {
    throw new Error("EXTENSION_LOCKED: Supplier Onboarding is read-only");
    const { supplierId } = req.params;
    const { actor, requestId } = (req as any).context;

    authorizeSupplierAction(actor, supplierId, requestId);

    const draft = createSupplierDraft(supplierId);

    emitAuditEvent({
      eventId: "SUPPLIER-DRAFT-CREATED",
      scope: "DATA_MUTATION",
      severity: "INFO",
      actor: actor.actorId,
      action: "CREATE_SUPPLIER_DRAFT",
      resource: supplierId,
      outcome: "ALLOW",
      requestId
    });

    res.status(201).json(draft);
  });

  return router;
}
