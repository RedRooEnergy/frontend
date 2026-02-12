import { findUserByEmail } from "../data/mockDb";
import { getUserRoleCodes } from "../rbac/runtimeStore";
import { issueToken } from "../auth/token";
import { appendPortalLoginAudit, getLastSuccessfulPortalLogin } from "../rbac/audit";
import { hasPortalAccess, resolvePortalDashboardPath } from "./config";
import type { RoleName } from "../rbac/types";

export function extractIpAddress(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return headers.get("x-real-ip") || "unknown";
}

export function processPortalLogin(params: {
  email: string;
  requestedRole?: RoleName;
  ipAddress: string;
}) {
  const user = findUserByEmail(params.email);
  if (!user) {
    appendPortalLoginAudit({
      actorUserId: "unknown",
      actorRole: "UNKNOWN",
      actorEmail: params.email,
      outcome: "DENY",
      reason: "Unknown account",
      ipAddress: params.ipAddress,
    });
    throw new Error("Invalid credentials");
  }

  const roles = getUserRoleCodes(user.id);
  if (!roles.length) {
    appendPortalLoginAudit({
      actorUserId: user.id,
      actorRole: "NONE",
      actorEmail: user.email,
      outcome: "DENY",
      reason: "User has no assigned role",
      ipAddress: params.ipAddress,
    });
    throw new Error("No active role assignment");
  }
  if (params.requestedRole && !roles.includes(params.requestedRole)) {
    appendPortalLoginAudit({
      actorUserId: user.id,
      actorRole: roles[0],
      actorEmail: user.email,
      outcome: "DENY",
      reason: "Requested role mismatch",
      ipAddress: params.ipAddress,
    });
    throw new Error("Role mismatch");
  }
  if (!hasPortalAccess(roles)) {
    appendPortalLoginAudit({
      actorUserId: user.id,
      actorRole: roles[0],
      actorEmail: user.email,
      outcome: "DENY",
      reason: "Role not permitted for portal",
      ipAddress: params.ipAddress,
    });
    throw new Error("Role is not authorized for portal");
  }

  const token = issueToken({
    userId: user.id,
    role: roles[0],
    roles,
    email: user.email,
  });
  appendPortalLoginAudit({
    actorUserId: user.id,
    actorRole: roles[0],
    actorEmail: user.email,
    outcome: "ALLOW",
    reason: "Portal login success",
    ipAddress: params.ipAddress,
  });

  return {
    token,
    actor: {
      userId: user.id,
      role: roles[0],
      roles,
      email: user.email,
      name: user.name,
    },
    redirectPath: resolvePortalDashboardPath(roles),
    lastLogin: getLastSuccessfulPortalLogin(user.id),
  };
}

