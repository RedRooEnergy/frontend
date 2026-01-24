import { Router } from "express";
import { submitSupplierDraft, getSupplierDraft } from "../store/supplier-draft-store";
import { emitAuditEvent } from "../../../../core/platform/src/audit/audit-logger";
import { authorizeSupplierAction } from "../auth/authorize-supplier";
import { requireComplianceForSubmission } from "../compliance/require-compliance";
import type { ComplianceStatus } from "../compliance/compliance-status";
import { CoreError } from "../../../../core/platform/src/errors/core-error";

export function buildSubmitDraftRouter(): Router {
  const router = Router();

  router.post("/drafts/:supplierId/submit", (req, res) => {
    throw new Error("EXTENSION_LOCKED: Supplier Onboarding is read-only");
    const { supplierId } = req.params;
    const { actor, requestId } = (req as any).context;

    authorizeSupplierAction(actor, supplierId, requestId);

    const draft = getSupplierDraft(supplierId);
    if (!draft) {
      throw new CoreError(
        "INVALID_REQUEST",
        "Supplier draft not found",
        404,
        requestId ?? "UNKNOWN"
      );
    }

    requireComplianceForSubmission(
      draft.complianceStatus as ComplianceStatus,
      requestId
    );

    const updated = submitSupplierDraft(supplierId);

    emitAuditEvent({
      eventId: "SUPPLIER-DRAFT-SUBMITTED",
      scope: "DATA_MUTATION",
      severity: "INFO",
      actor: actor.actorId,
      action: "SUBMIT_SUPPLIER_DRAFT",
      resource: supplierId,
      outcome: "ALLOW",
      requestId
    });

    res.status(200).json(updated);
  });

  return router;
}
