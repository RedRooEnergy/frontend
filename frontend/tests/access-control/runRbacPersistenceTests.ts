import assert from "node:assert/strict";

const TEST_DB_PATH = ".tmp/rbac-persistence.sqlite";

process.env.RBAC_DB_PATH = TEST_DB_PATH;
process.env.RBAC_RESET_ON_BOOT = "1";
process.env.RBAC_JWT_SECRET = process.env.RBAC_JWT_SECRET || "test-rbac-secret";

async function main() {
  const runtimeStore = await import("../../lib/rbac/runtimeStore");
  const mockDb = await import("../../lib/data/mockDb");

  const admin = mockDb.findUserByEmail("admin@redroo.test");
  assert.ok(admin, "Expected admin user to exist");

  const initialPolicyVersion = runtimeStore.getPolicyVersion();
  const grantResult = runtimeStore.grantRolePermission({
    actorUserId: admin!.id,
    actorRole: "RRE_ADMIN",
    roleId: "BUYER",
    permissionId: "MARKETING_PROMOTIONS:READ",
    reason: "Persistence test grant",
  });
  assert.equal(grantResult.changed, true);

  const policyVersionAfterGrant = runtimeStore.getPolicyVersion();
  assert.ok(policyVersionAfterGrant > initialPolicyVersion, "Policy version should increment after mutation");

  const auditAfterGrant = runtimeStore.listGovernanceAudit();
  assert.ok(auditAfterGrant.length > 0, "Governance audit should persist records");
  const latest = auditAfterGrant[auditAfterGrant.length - 1];
  assert.ok(latest.hash.length > 20, "Governance audit hash missing");

  process.env.RBAC_RESET_ON_BOOT = "0";
  delete (globalThis as any).__rbacSqlite;

  const persistedPolicyVersion = runtimeStore.getPolicyVersion();
  assert.equal(persistedPolicyVersion, policyVersionAfterGrant, "Policy version should persist across reconnect");

  const buyerPermissions = runtimeStore.listRolePermissions("BUYER");
  assert.ok(
    buyerPermissions.some((permission) => permission.id === "MARKETING_PROMOTIONS:READ"),
    "Role permission grant should persist across reconnect"
  );

  const persistedAudit = runtimeStore.listGovernanceAudit();
  assert.equal(persistedAudit.length, auditAfterGrant.length, "Governance audit count should persist across reconnect");

  console.log("PASS: rbac persistence tests");
}

main();
