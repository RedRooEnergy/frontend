import assert from "node:assert/strict";
import {
  createBuyerOrder,
  listAuditLog,
  listDashboardData,
  releaseSettlement,
  updateFreightShipment,
} from "../../lib/api/dashboardService";
import { findUserByEmail } from "../../lib/data/mockDb";
import { getUserRoleCodes } from "../../lib/rbac/runtimeStore";
import { AccessDeniedError } from "../../lib/rbac/errors";

function actorFor(email: string) {
  const user = findUserByEmail(email);
  if (!user) throw new Error(`Missing seeded user: ${email}`);
  const roles = getUserRoleCodes(user.id);
  return { userId: user.id, role: roles[0], roles, email: user.email } as const;
}

function mustThrow403(run: () => unknown) {
  try {
    run();
    assert.fail("Expected AccessDeniedError");
  } catch (error) {
    assert.ok(error instanceof AccessDeniedError, "Expected AccessDeniedError type");
    assert.equal((error as AccessDeniedError).status, 403);
  }
}

function testPermittedActions() {
  const buyer = actorFor("buyer@redroo.test");
  const finance = actorFor("finance@redroo.test");
  const freight = actorFor("freight@redroo.test");

  const createdOrder = createBuyerOrder(buyer, { supplierId: "usr-supplier-1", amount: 499 });
  assert.equal(typeof createdOrder.id, "string");
  assert.equal(createdOrder.amount, 499);

  const released = releaseSettlement(finance, "SET-10");
  assert.equal(released.state, "RELEASED");

  const shipment = updateFreightShipment(freight, "SHP-10", "DELIVERED");
  assert.equal(shipment.state, "DELIVERED");
}

function testForbiddenActions() {
  const buyer = actorFor("buyer@redroo.test");
  const ceo = actorFor("ceo@redroo.test");

  mustThrow403(() => releaseSettlement(buyer, "SET-10"));
  mustThrow403(() => createBuyerOrder(ceo, { supplierId: "usr-supplier-1", amount: 250 }));
}

function testAuditImmutability() {
  const admin = actorFor("admin@redroo.test");
  const logs = listAuditLog(admin);
  assert.ok(logs.length >= 4, "Expected audit entries from prior tests");

  for (let index = 0; index < logs.length; index += 1) {
    const row = logs[index];
    assert.ok(row.timestampUtc.length > 10, "timestampUtc missing");
    assert.ok(row.hash.length > 20, "record hash missing");
    if (index === 0) {
      assert.equal(row.previousHash, "GENESIS");
    } else {
      assert.equal(row.previousHash, logs[index - 1].hash);
    }
  }
}

function testDashboardShapes() {
  const buyer = actorFor("buyer@redroo.test");
  const finance = actorFor("finance@redroo.test");
  const marketing = actorFor("marketing@redroo.test");

  const buyerDashboard = listDashboardData(buyer, "buyer");
  assert.equal(buyerDashboard.domain, "buyer");
  assert.ok(Array.isArray((buyerDashboard.data as any).orders));
  assert.ok(Array.isArray((buyerDashboard.data as any).documents));

  const financeDashboard = listDashboardData(finance, "finance");
  assert.ok(Array.isArray((financeDashboard.data as any).settlements));
  assert.ok(Array.isArray((financeDashboard.data as any).pricingRules));

  const marketingDashboard = listDashboardData(marketing, "marketing");
  assert.ok(Array.isArray((marketingDashboard.data as any).promotions));
  assert.ok(Array.isArray((marketingDashboard.data as any).emails));
}

function main() {
  testPermittedActions();
  testForbiddenActions();
  testAuditImmutability();
  testDashboardShapes();
  console.log("PASS: access-control RBAC tests");
}

main();
