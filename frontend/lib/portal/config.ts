import type { RoleName } from "../rbac/types";

export type PortalDomain = "admin" | "finance" | "ceo" | "marketing" | "regulator";

export const PORTAL_ALLOWED_ROLES: RoleName[] = ["RRE_ADMIN", "RRE_FINANCE", "RRE_CEO", "DEVELOPER", "RRE_MARKETING", "RRE_REGULATOR"];

export function isPortalRole(role: RoleName) {
  return PORTAL_ALLOWED_ROLES.includes(role);
}

export function hasPortalAccess(roles: RoleName[]) {
  return roles.some((role) => isPortalRole(role));
}

export function resolvePortalDomainForRoles(roles: RoleName[]): PortalDomain {
  if (roles.includes("RRE_CEO")) return "ceo";
  if (roles.includes("RRE_ADMIN") || roles.includes("DEVELOPER")) return "admin";
  if (roles.includes("RRE_FINANCE")) return "finance";
  if (roles.includes("RRE_MARKETING")) return "marketing";
  if (roles.includes("RRE_REGULATOR")) return "regulator";
  throw new Error("No portal dashboard domain is available for actor roles");
}

export function resolvePortalDashboardPath(roles: RoleName[]) {
  return `/portal/dashboard/${resolvePortalDomainForRoles(roles)}`;
}
