import { issueToken } from "../auth/token";
import { AccessDeniedError } from "../rbac/errors";
import {
  assignUserRole,
  getUserRoleCodes,
  grantRolePermission,
  isLockedUser,
  listGovernanceAudit,
  listPermissions,
  listRolePermissions,
  listRoles,
  listUserRoles,
  listUsersWithRoles,
  removeUserRole,
  revokeRolePermission,
  type PermissionRecord,
} from "../rbac/runtimeStore";
import type { Actor, RoleName } from "../rbac/types";

const GOVERNANCE_ROLES = new Set<RoleName>(["RRE_CEO", "RRE_ADMIN", "DEVELOPER"]);

export function ensureGovernanceAccess(actor: Actor, mutate = false) {
  const hasRole = actor.roles.some((role) => GOVERNANCE_ROLES.has(role));
  if (!hasRole) {
    throw new AccessDeniedError("Only CEO or Admin can access governance control surface");
  }
  if (mutate && !hasRole) {
    throw new AccessDeniedError("Mutation requires governance role");
  }
}

export function governanceListRoles(actor: Actor) {
  ensureGovernanceAccess(actor);
  return listRoles();
}

export function governanceListPermissions(actor: Actor) {
  ensureGovernanceAccess(actor);
  return listPermissions();
}

export function governanceListRolePermissions(actor: Actor, roleId: string) {
  ensureGovernanceAccess(actor);
  return listRolePermissions(roleId);
}

export function governanceGrantPermission(actor: Actor, roleId: string, permissionId: string, reason: string) {
  ensureGovernanceAccess(actor, true);
  return grantRolePermission({
    actorUserId: actor.userId,
    actorRole: actor.role,
    roleId,
    permissionId,
    reason: reason || "Governance matrix update",
  });
}

export function governanceRevokePermission(actor: Actor, roleId: string, permissionId: string, reason: string) {
  ensureGovernanceAccess(actor, true);
  return revokeRolePermission({
    actorUserId: actor.userId,
    actorRole: actor.role,
    actorUserRoles: actor.roles,
    roleId,
    permissionId,
    reason: reason || "Governance matrix update",
  });
}

export function governanceListUsers(actor: Actor) {
  ensureGovernanceAccess(actor);
  return listUsersWithRoles();
}

export function governanceListUserRoles(actor: Actor, userId: string) {
  ensureGovernanceAccess(actor);
  return {
    userId,
    locked: isLockedUser(userId),
    roles: listUserRoles(userId),
  };
}

export function governanceAssignUserRole(actor: Actor, userId: string, roleId: string, reason: string) {
  ensureGovernanceAccess(actor, true);
  return assignUserRole({
    actorUserId: actor.userId,
    actorRole: actor.role,
    userId,
    roleId,
    reason: reason || "User role assignment update",
  });
}

export function governanceRemoveUserRole(actor: Actor, userId: string, roleId: string, reason: string) {
  ensureGovernanceAccess(actor, true);
  return removeUserRole({
    actorUserId: actor.userId,
    actorRole: actor.role,
    actorUserRoles: actor.roles,
    userId,
    roleId,
    reason: reason || "User role assignment update",
  });
}

export function governanceListAudit(actor: Actor) {
  ensureGovernanceAccess(actor);
  return listGovernanceAudit();
}

export function permissionIdsForDomainAccess(permissions: PermissionRecord[], subjects: string[], mode: "READ" | "MUTATE") {
  return permissions
    .filter((permission) => subjects.includes(permission.subject))
    .filter((permission) => (mode === "READ" ? permission.action === "READ" : permission.action !== "READ"))
    .map((permission) => permission.id);
}

export function issueFreshTokenForActor(actor: Actor) {
  const roles = getUserRoleCodes(actor.userId);
  if (!roles.length) {
    throw new Error("Actor no longer has active roles");
  }
  return issueToken({
    userId: actor.userId,
    role: roles[0],
    roles,
    email: actor.email,
  });
}
