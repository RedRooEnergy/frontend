import { Request, Response } from "express";
import { supplierDraftStore } from "../store/supplier-draft-store";
import { verifyCompliance } from "../compliance/verify-compliance";
import { authorizeCompliance } from "../authorize/authorize-compliance";
import { emitAuditEvent } from "../../../../core/platform/src/audit/audit-logger";

export function verifyComplianceRoute(req: Request, res: Response): void {
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

  const newStatus = verifyCompliance(draft.complianceStatus, requestId);

  supplierDraftStore.update({
    ...draft,
    complianceStatus: newStatus,
  });

  emitAuditEvent({
    eventId: "SUPPLIER-COMPLIANCE-VERIFIED",
    scope: "GOVERNANCE",
    severity: "INFO",
    outcome: "ALLOW",
    actor: actor.actorId,
    action: "VERIFY_COMPLIANCE",
    resource: supplierId,
    requestId,
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({ complianceStatus: newStatus });
}
