import { calculateDDP } from "./calculate-ddp";
import { DDPInput, DDPResult } from "./ddp-types";
import { emitAuditEvent } from "../../../../core/platform/src/audit/audit-logger";
import { buildActorContext } from "../../../../core/platform/src/auth/build-actor-context";

export function calculateDDPAudited(
  input: DDPInput,
  requestId: string
): DDPResult {
  const actor = buildActorContext();

  const result = calculateDDP(input);

  emitAuditEvent({
    eventId: "DDP-CALC-001",
    scope: "DATA_MUTATION",
    severity: "INFO",
    actor: actor.actorId,
    action: "DDP_CALCULATED",
    resource: input.shipmentId,
    outcome: "ALLOW",
    requestId,
    timestamp: new Date().toISOString(),
  });

  return result;
}
