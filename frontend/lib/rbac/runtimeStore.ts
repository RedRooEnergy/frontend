import crypto from "node:crypto";
import { RoleNames, Subjects, Actions, type Action, type RoleName, type Subject } from "./types";
import { DEFAULT_ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from "./defaults";
import { getDb } from "../data/mockDb";
import { AccessDeniedError } from "./errors";

export type RoleRecord = {
  id: string;
  name: RoleName;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type PermissionRecord = {
  id: string;
  name: string;
  description: string;
  subject: Subject;
  action: Action;
};

export type RolePermissionGrant = {
  roleId: string;
  permissionId: string;
  grantedByUserId: string;
  grantedAt: string;
};

export type UserRoleAssignment = {
  userId: string;
  roleId: string;
  assignedByUserId: string;
  assignedAt: string;
};

export type GovernanceChangeRecord = {
  id: string;
  timestampUtc: string;
  actorUserId: string;
  actorRole: string;
  operation: string;
  targetType: "ROLE_PERMISSION" | "USER_ROLE";
  targetId: string;
  reason: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  previousHash: string;
  hash: string;
};

type RuntimeState = {
  roles: RoleRecord[];
  permissions: PermissionRecord[];
  rolePermissions: RolePermissionGrant[];
  userRoles: UserRoleAssignment[];
  governanceAudit: GovernanceChangeRecord[];
  policyVersion: number;
  lockedUserIds: Set<string>;
};

function nowIso() {
  return new Date().toISOString();
}

function digest(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function permissionId(subject: Subject, action: Action) {
  return `${subject}:${action}`;
}

function permissionName(subject: Subject, action: Action) {
  return `${action.toLowerCase()}_${subject.toLowerCase()}`;
}

function roleId(role: RoleName) {
  return role;
}

const db = getDb();
const seededAt = nowIso();

const allPermissions: PermissionRecord[] = [];
for (const subject of Subjects) {
  for (const action of Actions) {
    if (action === "READ" || Object.values(DEFAULT_ROLE_PERMISSIONS).some((rows) => rows.some((r) => r.subject === subject && r.actions.includes(action)))) {
      allPermissions.push({
        id: permissionId(subject, action),
        name: permissionName(subject, action),
        description: `${action} permission for ${subject}`,
        subject,
        action,
      });
    }
  }
}

const roleRecords: RoleRecord[] = RoleNames.map((name) => ({
  id: roleId(name),
  name,
  description: ROLE_DESCRIPTIONS[name],
  createdAt: seededAt,
  updatedAt: seededAt,
}));

const rolePermissionGrants: RolePermissionGrant[] = [];
for (const roleName of RoleNames) {
  for (const permission of DEFAULT_ROLE_PERMISSIONS[roleName]) {
    for (const action of permission.actions) {
      rolePermissionGrants.push({
        roleId: roleId(roleName),
        permissionId: permissionId(permission.subject, action),
        grantedByUserId: "system-seed",
        grantedAt: seededAt,
      });
    }
  }
}

const userRoleAssignments: UserRoleAssignment[] = db.users.map((user) => ({
  userId: user.id,
  roleId: roleId(user.role),
  assignedByUserId: "system-seed",
  assignedAt: seededAt,
}));

const state: RuntimeState = {
  roles: roleRecords,
  permissions: allPermissions,
  rolePermissions: rolePermissionGrants,
  userRoles: userRoleAssignments,
  governanceAudit: [],
  policyVersion: 1,
  lockedUserIds: new Set(["usr-dev-1"]),
};

export function getPolicyVersion() {
  return state.policyVersion;
}

function bumpPolicyVersion() {
  state.policyVersion += 1;
}

export function isLockedUser(userId: string) {
  return state.lockedUserIds.has(userId);
}

export function listRoles() {
  return state.roles.map((item) => ({ ...item }));
}

export function listPermissions() {
  return state.permissions.map((item) => ({ ...item }));
}

export function listUsersWithRoles() {
  return db.users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    locked: isLockedUser(user.id),
    roleIds: state.userRoles.filter((row) => row.userId === user.id).map((row) => row.roleId),
  }));
}

export function listRolePermissions(roleIdValue: string) {
  const grants = state.rolePermissions.filter((row) => row.roleId === roleIdValue);
  return grants
    .map((grant) => state.permissions.find((permission) => permission.id === grant.permissionId))
    .filter((item): item is PermissionRecord => Boolean(item))
    .map((item) => ({ ...item }));
}

export function listUserRoles(userId: string) {
  return state.userRoles
    .filter((row) => row.userId === userId)
    .map((row) => state.roles.find((role) => role.id === row.roleId))
    .filter((item): item is RoleRecord => Boolean(item))
    .map((item) => ({ ...item }));
}

export function getUserRoleCodes(userId: string): RoleName[] {
  const rows = state.userRoles.filter((row) => row.userId === userId);
  if (!rows.length) return [];
  return rows
    .map((row) => state.roles.find((role) => role.id === row.roleId)?.name)
    .filter((value): value is RoleName => Boolean(value));
}

function appendGovernanceRecord(entry: {
  actorUserId: string;
  actorRole: string;
  operation: string;
  targetType: "ROLE_PERMISSION" | "USER_ROLE";
  targetId: string;
  reason: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
}) {
  const previousHash = state.governanceAudit.length ? state.governanceAudit[state.governanceAudit.length - 1].hash : "GENESIS";
  const id = `GOV-${String(state.governanceAudit.length + 1).padStart(5, "0")}`;
  const timestampUtc = nowIso();
  const hash = digest(
    JSON.stringify({
      id,
      timestampUtc,
      actorUserId: entry.actorUserId,
      actorRole: entry.actorRole,
      operation: entry.operation,
      targetType: entry.targetType,
      targetId: entry.targetId,
      reason: entry.reason,
      previousState: entry.previousState,
      newState: entry.newState,
      previousHash,
    })
  );
  const record: GovernanceChangeRecord = Object.freeze({
    id,
    timestampUtc,
    actorUserId: entry.actorUserId,
    actorRole: entry.actorRole,
    operation: entry.operation,
    targetType: entry.targetType,
    targetId: entry.targetId,
    reason: entry.reason,
    previousState: entry.previousState,
    newState: entry.newState,
    previousHash,
    hash,
  });
  state.governanceAudit.push(record);
  bumpPolicyVersion();
  return record;
}

function ensureRole(roleIdValue: string) {
  const row = state.roles.find((role) => role.id === roleIdValue);
  if (!row) throw new Error("Role not found");
  return row;
}

function ensurePermission(permissionIdValue: string) {
  const row = state.permissions.find((permission) => permission.id === permissionIdValue);
  if (!row) throw new Error("Permission not found");
  return row;
}

function ensureUser(userId: string) {
  const row = db.users.find((user) => user.id === userId);
  if (!row) throw new Error("User not found");
  return row;
}

export function grantRolePermission(params: {
  actorUserId: string;
  actorRole: string;
  roleId: string;
  permissionId: string;
  reason: string;
}) {
  ensureRole(params.roleId);
  const permission = ensurePermission(params.permissionId);
  const existing = state.rolePermissions.find((row) => row.roleId === params.roleId && row.permissionId === params.permissionId);
  if (existing) return { changed: false };

  const previousState = {
    roleId: params.roleId,
    permissionId: params.permissionId,
    hasGrant: false,
  };

  state.rolePermissions.push({
    roleId: params.roleId,
    permissionId: params.permissionId,
    grantedByUserId: params.actorUserId,
    grantedAt: nowIso(),
  });

  appendGovernanceRecord({
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    operation: "GRANT_ROLE_PERMISSION",
    targetType: "ROLE_PERMISSION",
    targetId: `${params.roleId}:${params.permissionId}`,
    reason: params.reason,
    previousState,
    newState: {
      roleId: params.roleId,
      permission: { id: permission.id, subject: permission.subject, action: permission.action },
      hasGrant: true,
    },
  });

  return { changed: true };
}

export function revokeRolePermission(params: {
  actorUserId: string;
  actorRole: string;
  actorUserRoles: RoleName[];
  roleId: string;
  permissionId: string;
  reason: string;
}) {
  ensureRole(params.roleId);
  const permission = ensurePermission(params.permissionId);
  const index = state.rolePermissions.findIndex((row) => row.roleId === params.roleId && row.permissionId === params.permissionId);
  if (index < 0) return { changed: false };

  if (params.actorUserRoles.includes("RRE_CEO") && params.roleId === "RRE_CEO" && permission.action === "READ") {
    throw new AccessDeniedError("CEO read access cannot be removed");
  }

  const previousState = {
    roleId: params.roleId,
    permission: { id: permission.id, subject: permission.subject, action: permission.action },
    hasGrant: true,
  };

  state.rolePermissions.splice(index, 1);

  appendGovernanceRecord({
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    operation: "REVOKE_ROLE_PERMISSION",
    targetType: "ROLE_PERMISSION",
    targetId: `${params.roleId}:${params.permissionId}`,
    reason: params.reason,
    previousState,
    newState: {
      roleId: params.roleId,
      permission: { id: permission.id, subject: permission.subject, action: permission.action },
      hasGrant: false,
    },
  });

  return { changed: true };
}

export function assignUserRole(params: {
  actorUserId: string;
  actorRole: string;
  userId: string;
  roleId: string;
  reason: string;
}) {
  ensureUser(params.userId);
  ensureRole(params.roleId);
  if (isLockedUser(params.userId)) {
    throw new AccessDeniedError("Developer account is locked and cannot be modified");
  }
  const exists = state.userRoles.some((row) => row.userId === params.userId && row.roleId === params.roleId);
  if (exists) return { changed: false };

  const previousState = {
    userId: params.userId,
    roleIds: state.userRoles.filter((row) => row.userId === params.userId).map((row) => row.roleId),
  };

  state.userRoles.push({
    userId: params.userId,
    roleId: params.roleId,
    assignedByUserId: params.actorUserId,
    assignedAt: nowIso(),
  });

  appendGovernanceRecord({
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    operation: "ASSIGN_USER_ROLE",
    targetType: "USER_ROLE",
    targetId: `${params.userId}:${params.roleId}`,
    reason: params.reason,
    previousState,
    newState: {
      userId: params.userId,
      roleIds: state.userRoles.filter((row) => row.userId === params.userId).map((row) => row.roleId),
    },
  });

  return { changed: true };
}

export function removeUserRole(params: {
  actorUserId: string;
  actorRole: string;
  actorUserRoles: RoleName[];
  userId: string;
  roleId: string;
  reason: string;
}) {
  ensureUser(params.userId);
  ensureRole(params.roleId);
  if (isLockedUser(params.userId)) {
    throw new AccessDeniedError("Developer account is locked and cannot be modified");
  }

  const index = state.userRoles.findIndex((row) => row.userId === params.userId && row.roleId === params.roleId);
  if (index < 0) return { changed: false };

  if (params.roleId === "RRE_ADMIN") {
    const adminCount = new Set(state.userRoles.filter((row) => row.roleId === "RRE_ADMIN").map((row) => row.userId)).size;
    if (adminCount <= 1) {
      throw new AccessDeniedError("Last Admin cannot be removed");
    }
  }

  if (params.actorUserId === params.userId && params.roleId === "RRE_CEO" && params.actorUserRoles.includes("RRE_CEO")) {
    throw new AccessDeniedError("CEO cannot remove own governance read role");
  }

  const previousState = {
    userId: params.userId,
    roleIds: state.userRoles.filter((row) => row.userId === params.userId).map((row) => row.roleId),
  };

  state.userRoles.splice(index, 1);

  appendGovernanceRecord({
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    operation: "REMOVE_USER_ROLE",
    targetType: "USER_ROLE",
    targetId: `${params.userId}:${params.roleId}`,
    reason: params.reason,
    previousState,
    newState: {
      userId: params.userId,
      roleIds: state.userRoles.filter((row) => row.userId === params.userId).map((row) => row.roleId),
    },
  });

  return { changed: true };
}

export function listGovernanceAudit() {
  return state.governanceAudit.map((entry) => ({
    ...entry,
    previousState: { ...entry.previousState },
    newState: { ...entry.newState },
  }));
}

export function getRoleActions(roleName: RoleName, subject: Subject): Action[] {
  const permissionIds = state.rolePermissions.filter((row) => row.roleId === roleId(roleName)).map((row) => row.permissionId);
  const actions = permissionIds
    .map((id) => state.permissions.find((permission) => permission.id === id))
    .filter((permission): permission is PermissionRecord => Boolean(permission))
    .filter((permission) => permission.subject === subject)
    .map((permission) => permission.action);
  return Array.from(new Set(actions));
}

export function getEffectiveActions(userId: string, subject: Subject): Action[] {
  const roles = getUserRoleCodes(userId);
  const actions = roles.flatMap((roleName) => getRoleActions(roleName, subject));
  return Array.from(new Set(actions));
}
