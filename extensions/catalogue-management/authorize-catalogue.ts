import { ActorContext } from "../../core/platform/src/request/request-context";
import { AuthorizationError } from "../../core/platform/src/errors/authorization-error";

export function authorizeCatalogueAction(
  _actor: ActorContext,
  action: "CREATE_DRAFT" | "APPROVE_DRAFT" | "PUBLISH"
): void {
  // Default-deny scaffold — allow rules will be added later
  throw new AuthorizationError(
    "AUTH_DENIED",
    `Catalogue action '${action}' not permitted`
  );
}
