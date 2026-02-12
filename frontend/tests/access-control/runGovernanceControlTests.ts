import assert from "node:assert/strict";
import {
  governanceAssignUserRole,
  governanceGrantPermission,
  governanceListAudit,
  governanceListPermissions,
  governanceListRolePermissions,
  governanceListRoles,
  governanceListUsers,
  governanceRemoveUserRole,
  governanceRevokePermission,
} from "../../lib/api/rbacGovernanceService";
import { AccessDeniedError } from "../../lib/rbac/errors";
import { findUserByEmail } from "../../lib/data/mockDb";
import { getPolicyVersion, getUserRoleCodes } from "../../lib/rbac/runtimeStore";

function actorFor(email: string) {
  const user = findUserByEmail(email);
  if (!user) throw new Error(`Missing user ${email}`);
  const roles = getUserRoleCodes(user.id);
  return {
    userId: user.id,
    role: roles[0],
    roles,
    email: user.email,
  };
}

function expect403(run: () => unknown, message: string) {
  try {
    run();
    assert.fail(`Expected AccessDeniedError: ${message}`);
  } catch (error) {
    assert.ok(error instanceof AccessDeniedError, `Expected AccessDeniedError for ${message}`);
    assert.equal((error as AccessDeniedError).status, 403);
  }
}

function testGovernanceMutations() {
  const admin = actorFor("admin@redroo.test");
  const buyer = actorFor("buyer@redroo.test");
  const ceo = actorFor("ceo@redroo.test");

  const roles = governanceListRoles(admin);
  assert.ok(roles.some((role) => role.id === "RRE_ADMIN"));

  const permissions = governanceListPermissions(admin);
  const marketingRead = permissions.find((permission) => permission.id === "MARKETING_PROMOTIONS:READ");
  assert.ok(marketingRead, "Expected MARKETING_PROMOTIONS:READ permission");

  expect403(() => governanceGrantPermission(buyer, "BUYER", marketingRead!.id, "Unauthorized mutation"), "buyer mutation");

  const policyStart = getPolicyVersion();
  const grantResult = governanceGrantPermission(admin, "BUYER", marketingRead!.id, "Enable buyer read to marketing promotions");
  assert.equal(typeof grantResult.changed, "boolean");
  assert.ok(getPolicyVersion() > policyStart, "Policy version should increment after permission grant");

  const buyerRolePermissions = governanceListRolePermissions(admin, "BUYER");
  assert.ok(buyerRolePermissions.some((permission) => permission.id === marketingRead!.id));

  expect403(
    () => governanceRevokePermission(ceo, "RRE_CEO", "ADMIN_OPERATIONS:READ", "Attempt to remove own read"),
    "CEO self-read protection"
  );
}

function testRoleAssignments() {
  const admin = actorFor("admin@redroo.test");
  const financeUser = findUserByEmail("finance@redroo.test");
  if (!financeUser) throw new Error("Missing finance user");

  const policyStart = getPolicyVersion();
  const assignResult = governanceAssignUserRole(admin, financeUser.id, "RRE_MARKETING", "Temporary dual role");
  assert.equal(typeof assignResult.changed, "boolean");
  assert.ok(getPolicyVersion() > policyStart, "Policy version should increment after role assignment");

  const userRows = governanceListUsers(admin);
  const financeRow = userRows.find((row) => row.id === financeUser.id);
  assert.ok(financeRow?.roleIds.includes("RRE_MARKETING"));

  const removeResult = governanceRemoveUserRole(admin, financeUser.id, "RRE_MARKETING", "Remove temporary dual role");
  assert.equal(typeof removeResult.changed, "boolean");

  expect403(
    () => governanceRemoveUserRole(admin, "usr-dev-1", "RRE_ADMIN", "Attempt to remove developer"),
    "Developer lock protection"
  );
}

function testGovernanceAuditChain() {
  const admin = actorFor("admin@redroo.test");
  const entries = governanceListAudit(admin);
  assert.ok(entries.length >= 2, "Expected governance mutations to be logged");
  for (let index = 0; index < entries.length; index += 1) {
    const row = entries[index];
    assert.ok(row.hash.length > 20, "Missing governance hash");
    if (index === 0) {
      assert.equal(row.previousHash, "GENESIS");
    } else {
      assert.equal(row.previousHash, entries[index - 1].hash);
    }
  }
}

function main() {
  testGovernanceMutations();
  testRoleAssignments();
  testGovernanceAuditChain();
  console.log("PASS: governance control tests");
}

main();

