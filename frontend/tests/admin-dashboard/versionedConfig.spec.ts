import assert from "node:assert/strict";
import {
  createPlatformFeeConfigVersion,
  getActivePlatformFeeConfig,
  updatePlatformFeeConfigVersion,
} from "../../lib/adminDashboard/platformFeeConfigStore";
import { createFxPolicyVersion, getActiveFxPolicy } from "../../lib/adminDashboard/fxPolicyStore";
import { createEscrowPolicyVersion, getActiveEscrowPolicy } from "../../lib/adminDashboard/escrowPolicyStore";

type TestResult = {
  id: string;
  pass: boolean;
  details: string;
};

type MemoryDoc = Record<string, any>;

class MemoryCollection {
  private docs: MemoryDoc[] = [];

  async createIndex() {
    return;
  }

  async findOne(query: Record<string, unknown>) {
    return this.docs.find((doc) => matchQuery(doc, query)) || null;
  }

  find(query: Record<string, unknown>) {
    const rows = this.docs.filter((doc) => matchQuery(doc, query));
    return {
      sort: (spec: Record<string, 1 | -1>) => {
        const [key, direction] = Object.entries(spec)[0] || [];
        const sorted = [...rows].sort((left, right) => {
          const l = Number(left[key as string] ?? 0);
          const r = Number(right[key as string] ?? 0);
          return direction === -1 ? r - l : l - r;
        });
        return {
          limit: (count: number) => ({
            next: async () => sorted.slice(0, count)[0] || null,
          }),
        };
      },
    };
  }

  async updateOne(filter: Record<string, unknown>, update: Record<string, any>) {
    const index = this.docs.findIndex((doc) => matchQuery(doc, filter));
    if (index === -1) return { matchedCount: 0, modifiedCount: 0 };
    if (update.$set && typeof update.$set === "object") {
      this.docs[index] = {
        ...this.docs[index],
        ...update.$set,
      };
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async insertOne(doc: Record<string, unknown>) {
    const clone = JSON.parse(JSON.stringify(doc));
    clone._id = `id-${this.docs.length + 1}`;
    this.docs.push(clone);
    return { insertedId: clone._id };
  }
}

class MemoryDb {
  private collections = new Map<string, MemoryCollection>();

  getCollection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection());
    }
    return this.collections.get(name)!;
  }
}

function matchQuery(doc: Record<string, unknown>, query: Record<string, unknown>) {
  for (const [key, value] of Object.entries(query)) {
    if (doc[key] !== value) return false;
  }
  return true;
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
  const memoryDb = new MemoryDb();
  const baseDeps = {
    getCollection: async (name: string) => memoryDb.getCollection(name) as any,
    now: () => new Date("2026-02-14T00:00:00.000Z"),
  };
  const results: TestResult[] = [];

  results.push(
    await runCheck("VERSIONED-CONFIG-CREATE-AND-RETIRE", async () => {
      const v1 = await createPlatformFeeConfigVersion(
        {
          createdBy: { userId: "admin-1", role: "admin" },
          reason: "initial config",
          rules: {
            buyerServiceFee: { mode: "percent", percent: 2 },
          },
          auditId: "audit-1",
          tenantId: "tenant-1",
        },
        baseDeps
      );

      assert.equal(v1.version, 1);
      assert.equal(v1.status, "ACTIVE");
      assert.equal(v1.canonicalHash.length, 64);

      const v2 = await createPlatformFeeConfigVersion(
        {
          createdBy: { userId: "admin-1", role: "admin" },
          reason: "update config",
          rules: {
            buyerServiceFee: { mode: "percent", percent: 3 },
          },
          auditId: "audit-2",
          tenantId: "tenant-1",
        },
        baseDeps
      );

      assert.equal(v2.version, 2);
      assert.equal(v2.status, "ACTIVE");
      const active = await getActivePlatformFeeConfig("tenant-1", baseDeps);
      assert.equal(active?.version, 2);
    })
  );

  results.push(
    await runCheck("VERSIONED-CONFIG-IMMUTABILITY-GUARD", () => {
      assert.throws(
        () => {
          updatePlatformFeeConfigVersion();
        },
        /immutable/i
      );
    })
  );

  results.push(
    await runCheck("VERSIONED-CONFIG-FX-AND-ESCROW", async () => {
      const fx = await createFxPolicyVersion(
        {
          createdBy: { userId: "admin-1", role: "admin" },
          reason: "fx baseline",
          rules: { baseCurrency: "RMB", settlementCurrency: "AUD", spreadBps: 100 },
          auditId: "audit-3",
          tenantId: "tenant-1",
        },
        baseDeps
      );
      assert.equal(fx.version, 1);
      assert.equal((await getActiveFxPolicy("tenant-1", baseDeps))?.version, 1);

      const escrow = await createEscrowPolicyVersion(
        {
          createdBy: { userId: "admin-1", role: "admin" },
          reason: "escrow baseline",
          rules: { triggers: { supplierRelease: { requiresDeliveryConfirmed: true } } },
          auditId: "audit-4",
          tenantId: "tenant-1",
        },
        baseDeps
      );
      assert.equal(escrow.version, 1);
      assert.equal((await getActiveEscrowPolicy("tenant-1", baseDeps))?.version, 1);
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
