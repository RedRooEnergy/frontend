import { Request, Response } from "express";
import { supplierDraftStore } from "../store/supplier-draft-store";
import { activateSupplier } from "../activation/activate-supplier";
import { authorizeCompliance } from "../authorize/authorize-compliance";
import { emitAuditEvent } from "../../../../core/platform/src/audit/audit-logger";
import { handoffSupplierToCore } from "../handlers/handoff-to-core";

export function activateSupplierRoute(req: Request, res: Response): void {
  const { supplierId } = req.params;
  const { actor, requestId } = (req as any).context;

  authorizeCompliance(actor.role, requestId);

  const draft = supplierDraftStore.get(supplierId);

  if (!draft) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }

  if (draft.status !== "SUBMITTED") {
    res.status(409).json({ error: "INVALID_STATE" });
    return;
  }

  const newStatus = activateSupplier(
    draft.complianceStatus as "VERIFIED",
    draft.activationStatus,
    requestId ?? "UNKNOWN"
  );

  supplierDraftStore.update({
    ...draft,
    activationStatus: newStatus,
  });

  handoffSupplierToCore(draft);

  emitAuditEvent({
    eventId: "SUPPLIER-ACTIVATED",
    scope: "GOVERNANCE",
    severity: "INFO",
    outcome: "ALLOW",
    actor: actor.actorId,
    action: "ACTIVATE_SUPPLIER",
    resource: supplierId,
    requestId,
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({ activationStatus: newStatus });
}
