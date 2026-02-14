import assert from "node:assert/strict";
import { AdminAuditError, hashCanonicalPayload, writeAdminAudit } from "../../lib/adminDashboard/auditWriter";

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

async function main() {
  const results: TestResult[] = [];

  results.push(
    await runCheck("AUDIT-HASH-DETERMINISTIC", () => {
      const first = hashCanonicalPayload({ b: 2, nested: { z: 2, a: 1 }, a: 1 });
      const second = hashCanonicalPayload({ a: 1, b: 2, nested: { a: 1, z: 2 } });
      const third = hashCanonicalPayload({ a: 1, b: 9, nested: { a: 1, z: 2 } });
      assert.equal(first, second);
      assert.notEqual(first, third);
    })
  );

  results.push(
    await runCheck("AUDIT-REASON-REQUIRED", async () => {
      let threw = false;
      try {
        await writeAdminAudit(
          {
            actor: { actorId: "admin-1", actorRole: "admin" },
            action: "ADMIN_CONFIG_UPDATE",
            entity: { type: "PLATFORM_FEE_CONFIG", id: "cfg-1" },
            reason: "   ",
            before: { version: 1 },
            after: { version: 2 },
          },
          {
            getCollection: async () => ({
              insertOne: async () => ({ insertedId: "fake-id" }),
            }),
          }
        );
      } catch (error) {
        threw = true;
        assert(error instanceof AdminAuditError);
        assert.equal((error as AdminAuditError).status, 400);
      }
      assert.equal(threw, true);
    })
  );

  results.push(
    await runCheck("AUDIT-WRITE-SUCCESS", async () => {
      const inserted: Array<Record<string, unknown>> = [];
      const record = await writeAdminAudit(
        {
          actor: { actorId: "admin-1", actorRole: "admin", email: "admin@example.com" },
          action: "ADMIN_CONFIG_UPDATE",
          entity: { type: "PLATFORM_FEE_CONFIG", id: "cfg-2" },
          reason: "market adjustment",
          before: { version: 1, value: 10 },
          after: { version: 2, value: 11 },
          correlationId: "corr-1",
          tenantId: "tenant-1",
        },
        {
          now: () => new Date("2026-02-14T00:00:00.000Z"),
          randomUuid: () => "audit-1",
          getCollection: async () => ({
            insertOne: async (doc) => {
              inserted.push(doc);
              return { insertedId: "mongo-1" };
            },
          }),
        }
      );

      assert.equal(record.auditId, "audit-1");
      assert.equal(record.ts, "2026-02-14T00:00:00.000Z");
      assert.equal(inserted.length, 1);
      assert.equal(record.beforeHash.length, 64);
      assert.equal(record.afterHash.length, 64);
      assert.notEqual(record.beforeHash, record.afterHash);
    })
  );

  const passCount = results.filter((entry) => entry.pass).length;
  const failCount = results.length - passCount;
  for (const row of results) {
    process.stdout.write(`${row.pass ? "PASS" : "FAIL"} ${row.id} ${row.details}\n`);
  }
  process.stdout.write(`SUMMARY total=${results.length} pass=${passCount} fail=${failCount}\n`);

  if (failCount > 0) process.exitCode = 1;
}

void main();
