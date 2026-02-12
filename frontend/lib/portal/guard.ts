import type { Actor } from "../rbac/types";
import { hasPortalAccess } from "./config";

export type PortalGuardResult =
  | { allow: true }
  | { allow: false; status: 401 | 403; reason: string };

export function evaluatePortalRouteAccess(pathname: string, actor: Actor | null): PortalGuardResult {
  if (!pathname.startsWith("/portal")) return { allow: true };
  if (pathname === "/portal/login") return { allow: true };

  if (!actor) {
    return { allow: false, status: 401, reason: "Authentication required" };
  }
  if (!hasPortalAccess(actor.roles)) {
    return { allow: false, status: 403, reason: "Role is not permitted for portal access" };
  }
  return { allow: true };
}

