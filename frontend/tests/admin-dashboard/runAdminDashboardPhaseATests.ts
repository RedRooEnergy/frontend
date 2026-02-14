import assert from "node:assert/strict";
import { GET as getDashboardIndex } from "../../app/api/admin/dashboard/route";
import { GET as getOverview } from "../../app/api/admin/dashboard/overview/route";
import { GET as getFinancial, POST as postFinancial } from "../../app/api/admin/dashboard/financial/route";
import { GET as getGovernance, POST as postGovernance } from "../../app/api/admin/dashboard/governance/route";

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
