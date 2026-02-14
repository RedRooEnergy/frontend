import assert from "node:assert/strict";
import { GET as getDashboardIndex } from "../../app/api/admin/dashboard/route";
import { GET as getOverview } from "../../app/api/admin/dashboard/overview/route";
import { GET as getFinancial, POST as postFinancial } from "../../app/api/admin/dashboard/financial/route";
import { GET as getFinancialConfig, POST as postFinancialConfig } from "../../app/api/admin/dashboard/financial/config/route";
import { POST as postFinancialHold } from "../../app/api/admin/dashboard/financial/holds/route";
import { POST as postFinancialHoldOverride } from "../../app/api/admin/dashboard/financial/holds/[holdId]/override/route";
import { GET as getGovernance, POST as postGovernance } from "../../app/api/admin/dashboard/governance/route";
import { listAdminMemoryCollectionRows } from "../../lib/adminDashboard/memoryCollection";

type TestResult = {
  id: string;
  pass: boolean;
  details: string;
};

async function runCheck(id: string, fn: () => void | Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { id, pass: true, details: "PASS" };
  } catch (error: any) {
    return { id, pass: false, details: String(error?.message || error) };
  }
}

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

async function main() {
  const results: TestResult[] = [];

  results.push(
    await runCheck("ADMIN-DASHBOARD-NONADMIN-BLOCKED", async () => {
      const response = await getOverview(makeRequest("http://localhost/api/admin/dashboard/overview"));
      assert.equal(response.status, 403);
    })
  );

  results.push(
    await runCheck("ADMIN-DASHBOARD-INDEX-501", async () => {
      const response = await getDashboardIndex(
        makeRequest("http://localhost/api/admin/dashboard", {
          headers: { "x-dev-admin": "1", "x-dev-admin-user": "admin-1" },
        })
      );
      assert.equal(response.status, 501);
      const payload = (await response.json()) as Record<string, unknown>;
      assert.equal(payload.error, "NOT_IMPLEMENTED");
    })
  );

  results.push(
    await runCheck("ADMIN-DASHBOARD-OVERVIEW-501", async () => {
      const response = await getOverview(
        makeRequest("http://localhost/api/admin/dashboard/overview", {
          headers: { "x-dev-admin": "1", "x-dev-admin-user": "admin-1" },
        })
      );
      assert.equal(response.status, 501);
      const payload = (await response.json()) as Record<string, unknown>;
      assert.equal(payload.error, "NOT_IMPLEMENTED");
    })
  );

  results.push(
    await runCheck("ADMIN-DASHBOARD-FINANCIAL-STUBS", async () => {
      const headers = { "x-dev-admin": "1", "x-dev-admin-user": "admin-1", "content-type": "application/json" };
      const getResponse = await getFinancial(makeRequest("http://localhost/api/admin/dashboard/financial", { headers }));
      assert.equal(getResponse.status, 501);
      const postResponse = await postFinancial(
        makeRequest("http://localhost/api/admin/dashboard/financial", {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        })
      );
      assert.equal(postResponse.status, 501);
    })
  );

  results.push(
    await runCheck("ADMIN-DASHBOARD-FINANCIAL-CONFIG-FLOW", async () => {
      const headers = {
        "x-dev-admin": "1",
        "x-dev-admin-user": "admin-1",
        "content-type": "application/json",
        origin: "http://localhost:3000",
      };

      const initial = await getFinancialConfig(
        makeRequest("http://localhost/api/admin/dashboard/financial/config", {
          headers,
        })
      );
      assert.equal(initial.status, 200);
      const initialPayload = (await initial.json()) as any;
      assert.equal(Object.prototype.hasOwnProperty.call(initialPayload, "feeConfig"), true);
      assert.equal(Object.prototype.hasOwnProperty.call(initialPayload, "fxPolicy"), true);
      assert.equal(Object.prototype.hasOwnProperty.call(initialPayload, "escrowPolicy"), true);

      const noReason = await postFinancialConfig(
        makeRequest("http://localhost/api/admin/dashboard/financial/config", {
          method: "POST",
          headers,
          body: JSON.stringify({
            feeConfig: { buyerServiceFee: { mode: "percent", percent: 2 } },
          }),
        })
      );
      assert.equal(noReason.status, 400);

      const first = await postFinancialConfig(
        makeRequest("http://localhost/api/admin/dashboard/financial/config", {
          method: "POST",
          headers,
          body: JSON.stringify({
            reason: "initial fee baseline",
            feeConfig: { buyerServiceFee: { mode: "percent", percent: 2 } },
          }),
        })
      );
      assert.equal(first.status, 200);
      const firstPayload = (await first.json()) as any;
      assert.equal(firstPayload.ok, true);
      assert.equal(firstPayload.updates[0].type, "feeConfig");
      assert.equal(firstPayload.updates[0].version, 1);
      assert.equal(String(firstPayload.updates[0].hash).length, 64);

      const second = await postFinancialConfig(
        makeRequest("http://localhost/api/admin/dashboard/financial/config", {
          method: "POST",
          headers,
          body: JSON.stringify({
            reason: "second fee baseline",
            feeConfig: { buyerServiceFee: { mode: "percent", percent: 3 } },
          }),
        })
      );
      assert.equal(second.status, 200);
      const secondPayload = (await second.json()) as any;
      assert.equal(secondPayload.updates[0].version, 2);
      assert.equal(String(secondPayload.updates[0].hash).length, 64);

      const latest = await getFinancialConfig(
        makeRequest("http://localhost/api/admin/dashboard/financial/config", {
          headers,
        })
      );
      const latestPayload = (await latest.json()) as any;
      assert.equal(latestPayload.feeConfig.version, 2);
    })
  );

  results.push(
    await runCheck("ADMIN-DASHBOARD-FINANCIAL-HOLD-FLOW", async () => {
      const headers = {
        "x-dev-admin": "1",
        "x-dev-admin-user": "admin-1",
        "content-type": "application/json",
        origin: "http://localhost:3000",
      };

      const beforeAuditCount = listAdminMemoryCollectionRows("admin_audit_logs").length;

      const missingReason = await postFinancialHold(
        makeRequest("http://localhost/api/admin/dashboard/financial/holds", {
          method: "POST",
          headers,
          body: JSON.stringify({
            subsystem: "PAYMENTS",
            scope: { orderId: "ORD-1001" },
          }),
        })
      );
      assert.equal(missingReason.status, 400);

      const create = await postFinancialHold(
        makeRequest("http://localhost/api/admin/dashboard/financial/holds", {
          method: "POST",
          headers,
          body: JSON.stringify({
            subsystem: "PAYMENTS",
            scope: { orderId: "ORD-1001" },
            reason: "payment review hold",
            reasonCode: "REVIEW_PENDING",
          }),
        })
      );
      assert.equal(create.status, 201);
      const createPayload = (await create.json()) as any;
      assert.equal(createPayload.ok, true);
      assert.equal(createPayload.hold.status, "ACTIVE");
      assert.equal(Boolean(createPayload.auditId), true);

      const holdId = String(createPayload.hold.holdId);
      const overrideMissingReason = await postFinancialHoldOverride(
        makeRequest(`http://localhost/api/admin/dashboard/financial/holds/${holdId}/override`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            justification: "manual verification complete",
          }),
        }),
        { params: { holdId } }
      );
      assert.equal(overrideMissingReason.status, 400);

      const override = await postFinancialHoldOverride(
        makeRequest(`http://localhost/api/admin/dashboard/financial/holds/${holdId}/override`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            reason: "clear payout",
            justification: "manual verification complete",
          }),
        }),
        { params: { holdId } }
      );
      assert.equal(override.status, 200);
      const overridePayload = (await override.json()) as any;
      assert.equal(overridePayload.ok, true);
      assert.equal(overridePayload.hold.status, "OVERRIDDEN");
      assert.equal(Boolean(overridePayload.auditId), true);

      const afterAuditCount = listAdminMemoryCollectionRows("admin_audit_logs").length;
      assert(afterAuditCount >= beforeAuditCount + 2, "Expected audit log growth for hold create + override");
    })
  );

  results.push(
    await runCheck("ADMIN-DASHBOARD-GOVERNANCE-STUBS", async () => {
      const headers = { "x-dev-admin": "1", "x-dev-admin-user": "admin-1", "content-type": "application/json" };
      const getResponse = await getGovernance(makeRequest("http://localhost/api/admin/dashboard/governance", { headers }));
      assert.equal(getResponse.status, 501);
      const postResponse = await postGovernance(
        makeRequest("http://localhost/api/admin/dashboard/governance", {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        })
      );
      assert.equal(postResponse.status, 501);
    })
  );

  const passCount = results.filter((row) => row.pass).length;
  const failCount = results.length - passCount;

  for (const row of results) {
    process.stdout.write(`${row.pass ? "PASS" : "FAIL"} ${row.id} ${row.details}\n`);
  }
  process.stdout.write(`SUMMARY total=${results.length} pass=${passCount} fail=${failCount}\n`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

void main();
