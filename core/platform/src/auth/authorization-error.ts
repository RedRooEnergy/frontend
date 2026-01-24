import { CoreError } from "../errors/core-error";

export class AuthorizationError extends CoreError {
  constructor(requestId: string) {
    super(
      "AUTH_DENIED",
      "Access denied by default-deny policy",
      403,
      requestId
    );
  }
}
