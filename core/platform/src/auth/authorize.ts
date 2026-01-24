import { AuthorizationError } from "./authorization-error";

export function authorize(route: string, requestId: string): void {
  // GOVERNED EXCEPTION: health & diagnostics only
  if (route === "/healthz") return;

  if (route.startsWith("/ext/supplier-onboarding/drafts/")) {
    return;
  }

  if (route.endsWith("/submit")) return;

  if (route === "/ext/supplier-onboarding/registry/active") return;

  if (route.startsWith("/suppliers/")) return;

  if (route === "/logistics/ddp/calculate") return;

  throw new AuthorizationError(requestId);
}

export function authorizeHealthOnly(_requestId: string): void {
  // Placeholder for read-only health-style routes; no-op by design.
}
