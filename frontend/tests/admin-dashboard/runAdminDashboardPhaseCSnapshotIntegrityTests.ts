import assert from "node:assert/strict";
import { GET as getGovernanceStatus } from "../../app/api/admin/dashboard/governance/status/route";
import { POST as postGovernanceRunAudit } from "../../app/api/admin/dashboard/governance/run-audit/route";
import { GET as getSnapshotIntegrity } from "../../app/api/admin/dashboard/governance/snapshot-integrity/route";

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
  process.env.NODE_ENV = "development";
  delete process.env.MONGODB_URI;

  const results: TestResult[] = [];
  const adminHeaders = {
    "x-dev-admin": "1",
    "x-dev-admin-user": "admin-snapshot-integrity",
  };

  results.push(
    await runCheck("ADMIN-GOV-SNAPSHOT-HASH-STABLE-ACROSS-RUN-AUDIT", async () => {
      const before = await getGovernanceStatus(
        makeRequest("http://localhost/api/admin/dashboard/governance/status", {
          headers: adminHeaders,
        })
      );
      assert.equal(before.status, 200);
      const beforePayload = (await before.json()) as any;
      assert.equal(typeof beforePayload.snapshotStateHash, "string");
      assert.equal(beforePayload.snapshotStateHash.length, 64);

      const runAudit = await postGovernanceRunAudit(
        makeRequest("http://localhost/api/admin/dashboard/governance/run-audit", {
          method: "POST",
          headers: {
            ...adminHeaders,
            "content-type": "application/json",
            origin: "http://localhost:3000",
          },
          body: JSON.stringify({
            reason: "phase-c snapshot integrity regression test",
          }),
        })
      );
      assert.equal(runAudit.status, 501);

      const after = await getGovernanceStatus(
        makeRequest("http://localhost/api/admin/dashboard/governance/status", {
          headers: adminHeaders,
        })
      );
      assert.equal(after.status, 200);
      const afterPayload = (await after.json()) as any;
      assert.equal(beforePayload.snapshotStateHash, afterPayload.snapshotStateHash);
      assert.equal(beforePayload.overall, afterPayload.overall);
    })
  );

  results.push(
    await runCheck("ADMIN-GOV-SNAPSHOT-INTEGRITY-ENDPOINT", async () => {
      const response = await getSnapshotIntegrity(
        makeRequest("http://localhost/api/admin/dashboard/governance/snapshot-integrity", {
          headers: adminHeaders,
        })
      );
      assert.equal(response.status, 200);
      const payload = (await response.json()) as any;
      assert.equal(payload.status, "PASS");
      assert.equal(typeof payload.snapshotStateHash, "string");
      assert.equal(payload.snapshotStateHash.length, 64);
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
