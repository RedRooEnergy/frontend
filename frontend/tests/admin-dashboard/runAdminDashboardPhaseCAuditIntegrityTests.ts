import assert from "node:assert/strict";
import { GET as getAuditIntegrity } from "../../app/api/admin/dashboard/governance/audit-integrity/route";
import {
  ADMIN_AUDIT_COLLECTION,
  verifyAdminAuditLogIntegrity,
  writeAdminAudit,
} from "../../lib/adminDashboard/auditWriter";
import { getAdminMemoryCollection } from "../../lib/adminDashboard/memoryCollection";

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

  results.push(
    await runCheck("ADMIN-AUDIT-INTEGRITY-BASELINE-PASS", async () => {
      await writeAdminAudit({
        actor: {
          actorId: "admin-audit-1",
          actorRole: "admin",
          email: "admin-audit@rre.test",
        },
        action: "ADMIN_AUDIT_INTEGRITY_BASELINE",
        entity: {
          type: "AUDIT_TEST",
          id: "AUDIT-BASELINE-1",
        },
        reason: "phase-c audit integrity baseline",
        before: null,
        after: { status: "ok" },
      });

      const result = await verifyAdminAuditLogIntegrity();
      assert.equal(result.status, "PASS");
      assert.equal(result.invalidRecords, 0);
    })
  );

  results.push(
    await runCheck("ADMIN-AUDIT-APPEND-ONLY-GUARD", async () => {
      const collection = getAdminMemoryCollection(ADMIN_AUDIT_COLLECTION);
      let threw = false;
      try {
        await collection.updateOne(
          { action: "ADMIN_AUDIT_INTEGRITY_BASELINE" },
          { $set: { reason: "tamper-attempt" } }
        );
      } catch (error: any) {
        threw = String(error?.message || "").includes("append-only");
      }
      assert.equal(threw, true);
    })
  );

  results.push(
    await runCheck("ADMIN-AUDIT-INTEGRITY-ENDPOINT", async () => {
      const response = await getAuditIntegrity(
        makeRequest("http://localhost/api/admin/dashboard/governance/audit-integrity", {
          headers: {
            "x-dev-admin": "1",
            "x-dev-admin-user": "admin-audit-1",
          },
        })
      );
      assert.equal(response.status, 200);
      const payload = (await response.json()) as any;
      assert.equal(payload.status, "PASS");
      assert.equal(Number(payload.invalidRecords || 0), 0);
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
