import { AuthorizationError } from "../../../../core/platform/src/auth/authorization-error";
import type { ActorContext } from "../../../../core/platform/src/auth/actor-context";

export function authorizeSupplierAction(
  actor: ActorContext,
  supplierId: string,
  requestId: string
): void {
  if (actor.role === "ADMINISTRATOR") return;

  if (actor.role === "SUPPLIER" && actor.actorId === supplierId) return;

  throw new AuthorizationError(requestId);
}
