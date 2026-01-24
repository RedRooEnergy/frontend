import { emitAuditEvent } from "../../../core/platform/src/audit/audit-logger";
import { DDPAuditEventType } from "./ddp-audit-events";

export function emitDDPAudit(
  eventType: DDPAuditEventType,
  shipmentId: string,
  requestId: string
): void {
  emitAuditEvent({
    eventId: eventType,
    timestamp: new Date().toISOString(),
    actor: "system",
    action: eventType,
    resource: shipmentId,
    outcome: "ALLOW",
    severity: "INFO",
    scope: "DATA_MUTATION",
    requestId,
  });
}
