import assert from "node:assert/strict";
import { GET as getFinancialConfig, POST as postFinancialConfig } from "../../app/api/admin/dashboard/financial/config/route";
import { POST as postFinancialHold } from "../../app/api/admin/dashboard/financial/holds/route";
import { POST as postFinancialHoldOverride } from "../../app/api/admin/dashboard/financial/holds/[holdId]/override/route";
import { GET as getGovernanceStatus } from "../../app/api/admin/dashboard/governance/status/route";
import { POST as postGovernanceRunAudit } from "../../app/api/admin/dashboard/governance/run-audit/route";
import { POST as postGovernanceChangeControl } from "../../app/api/admin/dashboard/governance/change-control/route";
import { listAdminMemoryCollectionRows } from "../../lib/adminDashboard/memoryCollection";

type TestResult = {
  id: string;
  pass: boolean;
  details: string;
};

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

async function runCheck(id: string, fn: () => void | Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { id, pass: true, details: "PASS" };
  } catch (error: any) {
    return { id, pass: false, details: String(error?.message || error) };
  }
}

async function main() {
  const results: TestResult[] = [];

  const adminHeaders = {
    "x-dev-admin": "1",
    "x-dev-admin-user": "admin-phase-a",
    "content-type": "application/json",
    origin: "http://localhost:3000",
  };

  results.push(
    await runCheck("PASSGATE-AUTH-ENFORCED", async () => {
      const nonAdmin = await getFinancialConfig(
        makeRequest("http://localhost/api/admin/dashboard/financial/config")
      );
      assert.equal(nonAdmin.status, 403);
    })
  );

  results.push(
    await runCheck("PASSGATE-REASON-REQUIRED", async () => {
      const configMissing = await postFinancialConfig(
        makeRequest("http://localhost/api/admin/dashboard/financial/config", {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ feeConfig: { buyerServiceFee: { mode: "percent", percent: 2 } } }),
        })
      );
      assert.equal(configMissing.status, 400);

      const holdMissing = await postFinancialHold(
        makeRequest("http://localhost/api/admin/dashboard/financial/holds", {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ subsystem: "PAYMENTS", scope: { orderId: "ORD-A6-1" } }),
        })
      );
      assert.equal(holdMissing.status, 400);

      const changeControlMissing = await postGovernanceChangeControl(
        makeRequest("http://localhost/api/admin/dashboard/governance/change-control", {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ type: "FEE_CHANGE", rationale: "test rationale" }),
        })
      );
      assert.equal(changeControlMissing.status, 400);
    })
  );

  results.push(
    await runCheck("PASSGATE-VERSIONED-CONFIG-NO-OVERWRITE", async () => {
      const first = await postFinancialConfig(
        makeRequest("http://localhost/api/admin/dashboard/financial/config", {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({
            reason: "phase-a config v1",
            feeConfig: { buyerServiceFee: { mode: "percent", percent: 2.1 } },
            tenantId: "tenant-phase-a",
          }),
        })
      );
      assert.equal(first.status, 200);

      const second = await postFinancialConfig(
        makeRequest("http://localhost/api/admin/dashboard/financial/config", {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({
            reason: "phase-a config v2",
            feeConfig: { buyerServiceFee: { mode: "percent", percent: 2.2 } },
            tenantId: "tenant-phase-a",
          }),
        })
      );
      assert.equal(second.status, 200);

      const configRows = listAdminMemoryCollectionRows("platform_fee_configs").filter(
        (row) => row.tenantId === "tenant-phase-a"
      );
      assert.equal(configRows.length >= 2, true);
      const activeCount = configRows.filter((row) => row.status === "ACTIVE").length;
      const retiredCount = configRows.filter((row) => row.status === "RETIRED").length;
      assert.equal(activeCount, 1);
      assert.equal(retiredCount >= 1, true);
    })
  );

  results.push(
    await runCheck("PASSGATE-HOLDS-LIFECYCLE-AUDITED", async () => {
      const beforeAudit = listAdminMemoryCollectionRows("admin_audit_logs").length;

      const created = await postFinancialHold(
        makeRequest("http://localhost/api/admin/dashboard/financial/holds", {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({
            reason: "phase-a hold",
            subsystem: "PAYMENTS",
            scope: { orderId: "ORD-A6-HOLD-1" },
          }),
        })
      );
      assert.equal(created.status, 201);
      const createdPayload = (await created.json()) as any;
      const holdId = String(createdPayload?.hold?.holdId || "");
      assert(holdId);

      const overridden = await postFinancialHoldOverride(
        makeRequest(`http://localhost/api/admin/dashboard/financial/holds/${holdId}/override`, {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({
            reason: "phase-a override",
            justification: "manual review complete",
          }),
        }),
        { params: { holdId } }
      );
      assert.equal(overridden.status, 200);
      const overriddenPayload = (await overridden.json()) as any;
      assert.equal(overriddenPayload?.hold?.status, "OVERRIDDEN");

      const afterAudit = listAdminMemoryCollectionRows("admin_audit_logs").length;
      assert(afterAudit >= beforeAudit + 2);
    })
  );

  results.push(
    await runCheck("PASSGATE-GOVERNANCE-RUN-AUDIT-NON-ENFORCING", async () => {
      const before = await getGovernanceStatus(
        makeRequest("http://localhost/api/admin/dashboard/governance/status", {
          headers: {
            "x-dev-admin": "1",
            "x-dev-admin-user": "admin-phase-a",
          },
        })
      );
      assert.equal(before.status, 200);
      const beforePayload = (await before.json()) as any;

      const runAudit = await postGovernanceRunAudit(
        makeRequest("http://localhost/api/admin/dashboard/governance/run-audit", {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ reason: "phase-a governance test trigger" }),
        })
      );
      assert.equal(runAudit.status, 501);

      const after = await getGovernanceStatus(
        makeRequest("http://localhost/api/admin/dashboard/governance/status", {
          headers: {
            "x-dev-admin": "1",
            "x-dev-admin-user": "admin-phase-a",
          },
        })
      );
      assert.equal(after.status, 200);
      const afterPayload = (await after.json()) as any;

      assert.equal(beforePayload?.overall, afterPayload?.overall);
      assert.equal(
        Array.isArray(beforePayload?.governanceChecks) ? beforePayload.governanceChecks.length : 0,
        Array.isArray(afterPayload?.governanceChecks) ? afterPayload.governanceChecks.length : 0
      );
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
