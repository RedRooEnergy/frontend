import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
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

type SqliteDatabase = InstanceType<typeof Database>;

const db = getDb();
const SYSTEM_ACTOR = "system-seed";
const POLICY_VERSION_KEY = "policyVersion";
const DEFAULT_POLICY_VERSION = 1;

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

function readInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function databasePath() {
  const configured = process.env.RBAC_DB_PATH;
  if (configured && configured.trim().length > 0) {
    return path.resolve(configured.trim());
  }
  return path.resolve(process.cwd(), ".data", "rbac-governance.sqlite");
}

function ensureDataDirectory(filePath: string) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
}

function createDatabaseConnection() {
  const filePath = databasePath();
  ensureDataDirectory(filePath);
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return sqlite;
}

function ensureSchema(sqlite: SqliteDatabase) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      subject TEXT NOT NULL,
      action TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      granted_by_user_id TEXT NOT NULL,
      granted_at TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      assigned_by_user_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      PRIMARY KEY (user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS governance_audit (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      timestamp_utc TEXT NOT NULL,
      actor_user_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      operation TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      previous_state TEXT NOT NULL,
      new_state TEXT NOT NULL,
      previous_hash TEXT NOT NULL,
      hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS policy_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS locked_users (
      user_id TEXT PRIMARY KEY
    );

    CREATE INDEX IF NOT EXISTS idx_permissions_subject_action ON permissions(subject, action);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
    CREATE INDEX IF NOT EXISTS idx_governance_audit_seq ON governance_audit(seq);
  `);
}

function maybeResetStore(sqlite: SqliteDatabase) {
  if (process.env.RBAC_RESET_ON_BOOT !== "1") return;
  sqlite.exec(`
    DELETE FROM governance_audit;
    DELETE FROM user_roles;
    DELETE FROM role_permissions;
    DELETE FROM locked_users;
    DELETE FROM policy_meta;
    DELETE FROM permissions;
    DELETE FROM roles;
    DELETE FROM users;
  `);
}

function seedUsers(sqlite: SqliteDatabase) {
  const insert = sqlite.prepare(`
    INSERT INTO users (id, email, display_name, is_active, created_at, updated_at)
    VALUES (@id, @email, @displayName, 1, @timestamp, @timestamp)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      is_active = 1,
      updated_at = excluded.updated_at
  `);
  const timestamp = nowIso();
  const transaction = sqlite.transaction(() => {
    for (const user of db.users) {
      insert.run({
        id: user.id,
        email: user.email,
        displayName: user.name,
        timestamp,
      });
    }
  });
  transaction();
}

function seedRoles(sqlite: SqliteDatabase) {
  const insert = sqlite.prepare(`
    INSERT OR IGNORE INTO roles (id, name, description, created_at, updated_at)
    VALUES (@id, @name, @description, @timestamp, @timestamp)
  `);
  const timestamp = nowIso();
  const transaction = sqlite.transaction(() => {
    for (const name of RoleNames) {
      insert.run({
        id: roleId(name),
        name,
        description: ROLE_DESCRIPTIONS[name],
        timestamp,
      });
    }
  });
  transaction();
}

function seedPermissions(sqlite: SqliteDatabase) {
  const allPermissions: PermissionRecord[] = [];
  for (const subject of Subjects) {
    for (const action of Actions) {
      if (
        action === "READ" ||
        Object.values(DEFAULT_ROLE_PERMISSIONS).some((rows) => rows.some((row) => row.subject === subject && row.actions.includes(action)))
      ) {
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

  const insert = sqlite.prepare(`
    INSERT OR IGNORE INTO permissions (id, name, description, subject, action)
    VALUES (@id, @name, @description, @subject, @action)
  `);

  const transaction = sqlite.transaction(() => {
    for (const permission of allPermissions) {
      insert.run(permission);
    }
  });
  transaction();
}

function seedDefaultAssignments(sqlite: SqliteDatabase) {
  const insertGrant = sqlite.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id, granted_at)
    VALUES (@roleId, @permissionId, @grantedByUserId, @grantedAt)
  `);
  const insertAssignment = sqlite.prepare(`
    INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_by_user_id, assigned_at)
    VALUES (@userId, @roleId, @assignedByUserId, @assignedAt)
  `);

  const transaction = sqlite.transaction(() => {
    const timestamp = nowIso();
    for (const roleName of RoleNames) {
      for (const permission of DEFAULT_ROLE_PERMISSIONS[roleName]) {
        for (const action of permission.actions) {
          insertGrant.run({
            roleId: roleId(roleName),
            permissionId: permissionId(permission.subject, action),
            grantedByUserId: SYSTEM_ACTOR,
            grantedAt: timestamp,
          });
        }
      }
    }

    for (const user of db.users) {
      insertAssignment.run({
        userId: user.id,
        roleId: roleId(user.role),
        assignedByUserId: SYSTEM_ACTOR,
        assignedAt: timestamp,
      });
    }
  });

  transaction();
}

function seedPolicyAndLocks(sqlite: SqliteDatabase) {
  sqlite
    .prepare(`
      INSERT OR IGNORE INTO policy_meta (key, value)
      VALUES (@key, @value)
    `)
    .run({
      key: POLICY_VERSION_KEY,
      value: String(DEFAULT_POLICY_VERSION),
    });

  sqlite.prepare("INSERT OR IGNORE INTO locked_users (user_id) VALUES (?)").run("usr-dev-1");
}

function seedDatabase(sqlite: SqliteDatabase) {
  seedUsers(sqlite);
  seedRoles(sqlite);
  seedPermissions(sqlite);
  seedDefaultAssignments(sqlite);
  seedPolicyAndLocks(sqlite);
}

function initializeDatabase(sqlite: SqliteDatabase) {
  ensureSchema(sqlite);
  maybeResetStore(sqlite);
  ensureSchema(sqlite);
  seedDatabase(sqlite);
}

function getRuntimeDatabase() {
  const globalScope = globalThis as unknown as { __rbacSqlite?: SqliteDatabase };
  if (!globalScope.__rbacSqlite) {
    const sqlite = createDatabaseConnection();
    initializeDatabase(sqlite);
    globalScope.__rbacSqlite = sqlite;
  }
  return globalScope.__rbacSqlite;
}

function ensureRole(sqlite: SqliteDatabase, roleIdValue: string) {
  const row = sqlite.prepare("SELECT id, name, description, created_at, updated_at FROM roles WHERE id = ?").get(roleIdValue) as
    | {
        id: string;
        name: RoleName;
        description: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;
  if (!row) throw new Error("Role not found");
  return row;
}

function ensurePermission(sqlite: SqliteDatabase, permissionIdValue: string) {
  const row = sqlite.prepare("SELECT id, name, description, subject, action FROM permissions WHERE id = ?").get(permissionIdValue) as
    | {
        id: string;
        name: string;
        description: string;
        subject: Subject;
        action: Action;
      }
    | undefined;
  if (!row) throw new Error("Permission not found");
  return row;
}

function ensureUser(sqlite: SqliteDatabase, userId: string) {
  const row = sqlite.prepare("SELECT id FROM users WHERE id = ?").get(userId) as { id: string } | undefined;
  if (!row) throw new Error("User not found");
  return row;
}

function readPolicyVersion(sqlite: SqliteDatabase) {
  const row = sqlite.prepare("SELECT value FROM policy_meta WHERE key = ?").get(POLICY_VERSION_KEY) as { value: string } | undefined;
  return readInteger(row?.value, DEFAULT_POLICY_VERSION);
}

function bumpPolicyVersion(sqlite: SqliteDatabase) {
  const next = readPolicyVersion(sqlite) + 1;
  sqlite.prepare("UPDATE policy_meta SET value = ? WHERE key = ?").run(String(next), POLICY_VERSION_KEY);
  return next;
}

function appendGovernanceRecord(
  sqlite: SqliteDatabase,
  entry: {
    actorUserId: string;
    actorRole: string;
    operation: string;
    targetType: "ROLE_PERMISSION" | "USER_ROLE";
    targetId: string;
    reason: string;
    previousState: Record<string, unknown>;
    newState: Record<string, unknown>;
  }
) {
  const nextSeq = readInteger(sqlite.prepare("SELECT COALESCE(MAX(seq), 0) + 1 AS nextSeq FROM governance_audit").get().nextSeq, 1);
  const previousHashRow = sqlite.prepare("SELECT hash FROM governance_audit ORDER BY seq DESC LIMIT 1").get() as { hash: string } | undefined;
  const previousHash = previousHashRow?.hash || "GENESIS";
  const timestampUtc = nowIso();
  const id = `GOV-${String(nextSeq).padStart(5, "0")}`;
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

  sqlite
    .prepare(`
      INSERT INTO governance_audit (
        seq, id, timestamp_utc, actor_user_id, actor_role, operation, target_type, target_id,
        reason, previous_state, new_state, previous_hash, hash
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      nextSeq,
      id,
      timestampUtc,
      entry.actorUserId,
      entry.actorRole,
      entry.operation,
      entry.targetType,
      entry.targetId,
      entry.reason,
      JSON.stringify(entry.previousState),
      JSON.stringify(entry.newState),
      previousHash,
      hash
    );
  bumpPolicyVersion(sqlite);
}

export function getPolicyVersion() {
  return readPolicyVersion(getRuntimeDatabase());
}

export function isLockedUser(userId: string) {
  const sqlite = getRuntimeDatabase();
  const row = sqlite.prepare("SELECT user_id FROM locked_users WHERE user_id = ?").get(userId) as { user_id: string } | undefined;
  return Boolean(row);
}

export function listRoles() {
  const sqlite = getRuntimeDatabase();
  const rows = sqlite.prepare("SELECT id, name, description, created_at, updated_at FROM roles ORDER BY name ASC").all() as Array<{
    id: string;
    name: RoleName;
    description: string;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function listPermissions() {
  const sqlite = getRuntimeDatabase();
  const rows = sqlite.prepare("SELECT id, name, description, subject, action FROM permissions ORDER BY subject ASC, action ASC").all() as Array<{
    id: string;
    name: string;
    description: string;
    subject: Subject;
    action: Action;
  }>;
  return rows.map((row) => ({ ...row }));
}

export function listUsersWithRoles() {
  const sqlite = getRuntimeDatabase();
  const assignments = sqlite.prepare("SELECT user_id, role_id FROM user_roles ORDER BY role_id ASC").all() as Array<{
    user_id: string;
    role_id: string;
  }>;

  const rolesByUserId = new Map<string, string[]>();
  for (const row of assignments) {
    const current = rolesByUserId.get(row.user_id) || [];
    current.push(row.role_id);
    rolesByUserId.set(row.user_id, current);
  }

  return db.users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    locked: isLockedUser(user.id),
    roleIds: rolesByUserId.get(user.id) || [],
  }));
}

export function listRolePermissions(roleIdValue: string) {
  const sqlite = getRuntimeDatabase();
  const rows = sqlite
    .prepare(
      `
      SELECT p.id, p.name, p.description, p.subject, p.action
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.subject ASC, p.action ASC
    `
    )
    .all(roleIdValue) as Array<{
    id: string;
    name: string;
    description: string;
    subject: Subject;
    action: Action;
  }>;
  return rows.map((row) => ({ ...row }));
}

export function listUserRoles(userId: string) {
  const sqlite = getRuntimeDatabase();
  const rows = sqlite
    .prepare(
      `
      SELECT r.id, r.name, r.description, r.created_at, r.updated_at
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
      ORDER BY r.name ASC
    `
    )
    .all(userId) as Array<{
    id: string;
    name: RoleName;
    description: string;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getUserRoleCodes(userId: string): RoleName[] {
  const sqlite = getRuntimeDatabase();
  const rows = sqlite
    .prepare(
      `
      SELECT r.name
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
      ORDER BY ur.assigned_at ASC
    `
    )
    .all(userId) as Array<{ name: RoleName }>;
  return rows.map((row) => row.name);
}

export function grantRolePermission(params: {
  actorUserId: string;
  actorRole: string;
  roleId: string;
  permissionId: string;
  reason: string;
}) {
  const sqlite = getRuntimeDatabase();
  const transaction = sqlite.transaction(() => {
    ensureRole(sqlite, params.roleId);
    const permission = ensurePermission(sqlite, params.permissionId);
    const exists = sqlite
      .prepare("SELECT 1 AS present FROM role_permissions WHERE role_id = ? AND permission_id = ?")
      .get(params.roleId, params.permissionId) as { present: number } | undefined;
    if (exists) return { changed: false as const };

    sqlite
      .prepare("INSERT INTO role_permissions (role_id, permission_id, granted_by_user_id, granted_at) VALUES (?, ?, ?, ?)")
      .run(params.roleId, params.permissionId, params.actorUserId, nowIso());

    appendGovernanceRecord(sqlite, {
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      operation: "GRANT_ROLE_PERMISSION",
      targetType: "ROLE_PERMISSION",
      targetId: `${params.roleId}:${params.permissionId}`,
      reason: params.reason,
      previousState: {
        roleId: params.roleId,
        permissionId: params.permissionId,
        hasGrant: false,
      },
      newState: {
        roleId: params.roleId,
        permission: { id: permission.id, subject: permission.subject, action: permission.action },
        hasGrant: true,
      },
    });

    return { changed: true as const };
  });

  return transaction();
}

export function revokeRolePermission(params: {
  actorUserId: string;
  actorRole: string;
  actorUserRoles: RoleName[];
  roleId: string;
  permissionId: string;
  reason: string;
}) {
  const sqlite = getRuntimeDatabase();
  const transaction = sqlite.transaction(() => {
    ensureRole(sqlite, params.roleId);
    const permission = ensurePermission(sqlite, params.permissionId);
    const exists = sqlite
      .prepare("SELECT 1 AS present FROM role_permissions WHERE role_id = ? AND permission_id = ?")
      .get(params.roleId, params.permissionId) as { present: number } | undefined;
    if (!exists) return { changed: false as const };

    if (params.actorUserRoles.includes("DEVELOPER") && params.roleId === "RRE_CEO") {
      throw new AccessDeniedError("Developer cannot revoke CEO role permissions");
    }

    if (params.actorUserRoles.includes("RRE_CEO") && params.roleId === "RRE_CEO" && permission.action === "READ") {
      throw new AccessDeniedError("CEO read access cannot be removed");
    }

    sqlite.prepare("DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?").run(params.roleId, params.permissionId);

    appendGovernanceRecord(sqlite, {
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      operation: "REVOKE_ROLE_PERMISSION",
      targetType: "ROLE_PERMISSION",
      targetId: `${params.roleId}:${params.permissionId}`,
      reason: params.reason,
      previousState: {
        roleId: params.roleId,
        permission: { id: permission.id, subject: permission.subject, action: permission.action },
        hasGrant: true,
      },
      newState: {
        roleId: params.roleId,
        permission: { id: permission.id, subject: permission.subject, action: permission.action },
        hasGrant: false,
      },
    });

    return { changed: true as const };
  });

  return transaction();
}

export function assignUserRole(params: {
  actorUserId: string;
  actorRole: string;
  userId: string;
  roleId: string;
  reason: string;
}) {
  const sqlite = getRuntimeDatabase();
  const transaction = sqlite.transaction(() => {
    ensureUser(sqlite, params.userId);
    ensureRole(sqlite, params.roleId);
    if (isLockedUser(params.userId)) {
      throw new AccessDeniedError("Developer account is locked and cannot be modified");
    }

    const exists = sqlite
      .prepare("SELECT 1 AS present FROM user_roles WHERE user_id = ? AND role_id = ?")
      .get(params.userId, params.roleId) as { present: number } | undefined;
    if (exists) return { changed: false as const };

    const previousRoleIds = getUserRoleCodes(params.userId);
    sqlite
      .prepare("INSERT INTO user_roles (user_id, role_id, assigned_by_user_id, assigned_at) VALUES (?, ?, ?, ?)")
      .run(params.userId, params.roleId, params.actorUserId, nowIso());

    appendGovernanceRecord(sqlite, {
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      operation: "ASSIGN_USER_ROLE",
      targetType: "USER_ROLE",
      targetId: `${params.userId}:${params.roleId}`,
      reason: params.reason,
      previousState: {
        userId: params.userId,
        roleIds: previousRoleIds,
      },
      newState: {
        userId: params.userId,
        roleIds: getUserRoleCodes(params.userId),
      },
    });

    return { changed: true as const };
  });

  return transaction();
}

export function removeUserRole(params: {
  actorUserId: string;
  actorRole: string;
  actorUserRoles: RoleName[];
  userId: string;
  roleId: string;
  reason: string;
}) {
  const sqlite = getRuntimeDatabase();
  const transaction = sqlite.transaction(() => {
    ensureUser(sqlite, params.userId);
    ensureRole(sqlite, params.roleId);
    if (isLockedUser(params.userId)) {
      throw new AccessDeniedError("Developer account is locked and cannot be modified");
    }

    const exists = sqlite
      .prepare("SELECT 1 AS present FROM user_roles WHERE user_id = ? AND role_id = ?")
      .get(params.userId, params.roleId) as { present: number } | undefined;
    if (!exists) return { changed: false as const };

    if (params.actorUserRoles.includes("DEVELOPER") && params.actorUserId === params.userId) {
      throw new AccessDeniedError("Developer cannot remove own access");
    }

    if (params.actorUserRoles.includes("DEVELOPER") && params.roleId === "RRE_CEO") {
      throw new AccessDeniedError("Developer cannot remove CEO role assignments");
    }

    if (params.roleId === "RRE_ADMIN") {
      const adminCount = readInteger(
        sqlite.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM user_roles WHERE role_id = ?").get("RRE_ADMIN").count,
        0
      );
      if (adminCount <= 1) {
        throw new AccessDeniedError("Last Admin cannot be removed");
      }
    }

    if (params.actorUserId === params.userId && params.roleId === "RRE_CEO" && params.actorUserRoles.includes("RRE_CEO")) {
      throw new AccessDeniedError("CEO cannot remove own governance read role");
    }

    const previousRoleIds = getUserRoleCodes(params.userId);
    sqlite.prepare("DELETE FROM user_roles WHERE user_id = ? AND role_id = ?").run(params.userId, params.roleId);

    appendGovernanceRecord(sqlite, {
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      operation: "REMOVE_USER_ROLE",
      targetType: "USER_ROLE",
      targetId: `${params.userId}:${params.roleId}`,
      reason: params.reason,
      previousState: {
        userId: params.userId,
        roleIds: previousRoleIds,
      },
      newState: {
        userId: params.userId,
        roleIds: getUserRoleCodes(params.userId),
      },
    });

    return { changed: true as const };
  });

  return transaction();
}

export function listGovernanceAudit() {
  const sqlite = getRuntimeDatabase();
  const rows = sqlite
    .prepare(
      `
      SELECT
        id, timestamp_utc, actor_user_id, actor_role, operation, target_type, target_id, reason,
        previous_state, new_state, previous_hash, hash
      FROM governance_audit
      ORDER BY seq ASC
    `
    )
    .all() as Array<{
    id: string;
    timestamp_utc: string;
    actor_user_id: string;
    actor_role: string;
    operation: string;
    target_type: "ROLE_PERMISSION" | "USER_ROLE";
    target_id: string;
    reason: string;
    previous_state: string;
    new_state: string;
    previous_hash: string;
    hash: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    timestampUtc: row.timestamp_utc,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    operation: row.operation,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    previousState: JSON.parse(row.previous_state),
    newState: JSON.parse(row.new_state),
    previousHash: row.previous_hash,
    hash: row.hash,
  }));
}

export function getRoleActions(roleName: RoleName, subject: Subject): Action[] {
  const sqlite = getRuntimeDatabase();
  const rows = sqlite
    .prepare(
      `
      SELECT DISTINCT p.action
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.subject = ?
      ORDER BY p.action ASC
    `
    )
    .all(roleId(roleName), subject) as Array<{ action: Action }>;
  return rows.map((row) => row.action);
}

export function getEffectiveActions(userId: string, subject: Subject): Action[] {
  const sqlite = getRuntimeDatabase();
  const rows = sqlite
    .prepare(
      `
      SELECT DISTINCT p.action
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = ? AND p.subject = ?
      ORDER BY p.action ASC
    `
    )
    .all(userId, subject) as Array<{ action: Action }>;
  return rows.map((row) => row.action);
}
