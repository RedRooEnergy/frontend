import assert from "node:assert/strict";
import { findUserByEmail } from "../../lib/data/mockDb";
import { evaluatePortalRouteAccess } from "../../lib/portal/guard";
import { hasPortalAccess, resolvePortalDashboardPath } from "../../lib/portal/config";
import { processPortalLogin } from "../../lib/portal/auth";
import { getPortalLoginAuditLog } from "../../lib/rbac/audit";
import { issueToken, verifyToken } from "../../lib/auth/token";
import { canActorReadDomain } from "../../lib/portal/domainAccess";
import { getUserRoleCodes } from "../../lib/rbac/runtimeStore";
import { createBuyerOrder } from "../../lib/api/dashboardService";
import { AccessDeniedError } from "../../lib/rbac/errors";

process.env.RBAC_JWT_SECRET = process.env.RBAC_JWT_SECRET || "test-rbac-secret";

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

function testUnauthorizedPortalRequest() {
  const decision = evaluatePortalRouteAccess("/portal/dashboard/admin", null);
  assert.equal(decision.allow, false);
  if (!decision.allow) {
    assert.equal(decision.status, 401);
  }
}

function testBuyerDeniedPortalAccess() {
  const buyer = actorFor("buyer@redroo.test");
  const decision = evaluatePortalRouteAccess("/portal/dashboard/admin", buyer);
  assert.equal(decision.allow, false);
  if (!decision.allow) {
    assert.equal(decision.status, 403);
  }
}

function testRoleRedirects() {
  const ceo = actorFor("ceo@redroo.test");
  const admin = actorFor("admin@redroo.test");
  const regulator = actorFor("regulator@redroo.test");
  assert.equal(resolvePortalDashboardPath(ceo.roles), "/portal/dashboard/ceo");
  assert.equal(resolvePortalDashboardPath(admin.roles), "/portal/dashboard/admin");
  assert.equal(resolvePortalDashboardPath(regulator.roles), "/portal/dashboard/regulator");
}

function testTokenExpiry() {
  const finance = actorFor("finance@redroo.test");
  const expiredToken = issueToken(finance, -1);
  assert.equal(verifyToken(expiredToken), null);
}

function testPortalLoginAudit() {
  const login = processPortalLogin({
    email: "admin@redroo.test",
    requestedRole: "RRE_ADMIN",
    ipAddress: "127.0.0.1",
  });
  assert.ok(login.redirectPath.endsWith("/portal/dashboard/admin"));

  const entries = getPortalLoginAuditLog();
  assert.ok(entries.length > 0, "Expected portal login audit entry");
  const latest = entries[entries.length - 1];
  assert.equal(latest.outcome, "ALLOW");
  assert.equal(latest.actorEmail, "admin@redroo.test");
  assert.ok(latest.hash.length > 20);
}

function testDomainDenial() {
  const syntheticPortalActor = {
    userId: "usr-nonexistent",
    role: "RRE_MARKETING" as const,
    roles: ["RRE_MARKETING"] as const,
    email: "synthetic@redroo.test",
  };
  assert.equal(hasPortalAccess([...syntheticPortalActor.roles]), true);
  const canRead = canActorReadDomain(syntheticPortalActor as any, "admin");
  assert.equal(canRead, false);
  const expectedStatus = hasPortalAccess([...syntheticPortalActor.roles]) && !canRead ? 403 : 200;
  assert.equal(expectedStatus, 403);
}

function testRegulatorReadOnlyMutations() {
  const regulator = actorFor("regulator@redroo.test");
  let denied = false;
  try {
    createBuyerOrder(regulator as any, { supplierId: "usr-supplier-1", amount: 100 });
  } catch (error) {
    denied = error instanceof AccessDeniedError;
  }
  assert.equal(denied, true);
}

function main() {
  testUnauthorizedPortalRequest();
  testBuyerDeniedPortalAccess();
  testRoleRedirects();
  testTokenExpiry();
  testPortalLoginAudit();
  testDomainDenial();
  testRegulatorReadOnlyMutations();
  console.log("PASS: portal access tests");
}

main();
