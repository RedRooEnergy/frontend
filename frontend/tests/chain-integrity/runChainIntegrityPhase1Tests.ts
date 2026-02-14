import assert from "node:assert/strict";
import { assertSha256LowerHex64 } from "../../lib/chainIntegrity/hashValidation";
import {
  createFreightSettlementRecord,
  type FreightSettlementStoreDependencies,
  upsertFreightSettlementRecord,
} from "../../lib/chainIntegrity/freightSettlementStore";
import {
  type ExportManifestStoreDependencies,
  upsertExportManifestRecord,
} from "../../lib/chainIntegrity/exportManifestStore";

type TestResult = {
  id: string;
  pass: boolean;
  details: string;
};

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const HASH_D = "d".repeat(64);

class MockCollection {
  private docs: any[] = [];
  private idCounter = 0;

  async createIndex(_spec: Record<string, 1 | -1>, _options?: Record<string, unknown>) {
    return "ok";
  }

  async insertOne(doc: any) {
    const _id = `mock-${++this.idCounter}`;
    const next = { ...doc, _id };
    this.docs.push(next);
    return { insertedId: _id };
  }

  async findOne(query: Record<string, unknown>) {
    return this.docs.find((doc) => this.matches(doc, query)) || null;
  }

  async findOneAndUpdate(
    query: Record<string, unknown>,
    update: Record<string, any>,
    options?: { returnDocument?: "after" | "before"; upsert?: boolean }
  ) {
    const index = this.docs.findIndex((doc) => this.matches(doc, query));
    const set = update.$set || {};
    const setOnInsert = update.$setOnInsert || {};

    if (index >= 0) {
      const current = this.docs[index];
      const next = {
        ...current,
        ...set,
      };
      this.docs[index] = next;
      return options?.returnDocument === "before" ? current : next;
    }

    if (!options?.upsert) {
      return null;
    }

    const _id = `mock-${++this.idCounter}`;
    const created = {
      ...query,
      ...setOnInsert,
      ...set,
      _id,
    };
    this.docs.push(created);
    return created;
  }

  count() {
    return this.docs.length;
  }

  private matches(doc: any, query: Record<string, unknown>) {
    return Object.entries(query).every(([key, value]) => {
      return doc[key] === value;
    });
  }
}

async function runCheck(id: string, fn: () => void | Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { id, pass: true, details: "PASS" };
  } catch (error: any) {
    return { id, pass: false, details: String(error?.message || error) };
  }
}

function buildExportDeps(collection: MockCollection): Partial<ExportManifestStoreDependencies> {
  return {
    getCollection: async () => collection as any,
    now: () => new Date("2026-02-14T00:00:00.000Z"),
    randomId: () => "exp-fixed-id",
  };
}

function buildFreightDeps(collection: MockCollection): Partial<FreightSettlementStoreDependencies> {
  return {
    getCollection: async () => collection as any,
    now: () => new Date("2026-02-14T00:00:00.000Z"),
    randomId: () => "fr-fixed-id",
  };
}

async function main() {
  const results: TestResult[] = [];

  results.push(
    await runCheck("VALIDATOR-REJECTS-UPPERCASE", () => {
      assert.throws(() => assertSha256LowerHex64("A".repeat(64), "hash"), /64-char lowercase SHA-256 hex/);
    })
  );

  results.push(
    await runCheck("VALIDATOR-REJECTS-WRONG-LENGTH", () => {
      assert.throws(() => assertSha256LowerHex64("a".repeat(63), "hash"), /64-char lowercase SHA-256 hex/);
    })
  );

  results.push(
    await runCheck("EXPORT-WRITE-ONCE-ENFORCED", async () => {
      const collection = new MockCollection();
      const deps = buildExportDeps(collection);

      await upsertExportManifestRecord(
        {
          orderId: "ORD-100",
          exportManifestHash: HASH_A,
          paymentSnapshotHash: HASH_B,
          signaturePresent: true,
        },
        deps
      );

      await assert.rejects(
        () =>
          upsertExportManifestRecord(
            {
              orderId: "ORD-100",
              exportManifestHash: HASH_A,
              paymentSnapshotHash: HASH_C,
              signaturePresent: true,
            },
            deps
          ),
        /WRITE_ONCE_VIOLATION:paymentSnapshotHash/
      );

      await assert.rejects(
        () =>
          upsertExportManifestRecord(
            {
              orderId: "ORD-100",
              exportManifestHash: HASH_C,
              paymentSnapshotHash: HASH_B,
            },
            deps
          ),
        /WRITE_ONCE_VIOLATION:exportManifestHash/
      );

      assert.equal(collection.count(), 1, "Unexpected export manifest record count");
    })
  );

  results.push(
    await runCheck("FREIGHT-DRAFT-ALLOWED", async () => {
      const collection = new MockCollection();
      const deps = buildFreightDeps(collection);

      const row = await createFreightSettlementRecord(
        {
          orderId: "ORD-200",
          status: "DRAFT",
        },
        deps
      );

      assert.equal(row.status, "DRAFT");
      assert.equal(row.paymentSnapshotHash, null);
      assert.equal(row.exportManifestHash, null);
      assert.equal(row.freightSettlementHash, null);
    })
  );

  results.push(
    await runCheck("FREIGHT-FINAL-SET-ONCE", async () => {
      const collection = new MockCollection();
      const deps = buildFreightDeps(collection);

      await upsertFreightSettlementRecord(
        {
          orderId: "ORD-300",
          settlementVersion: "v1",
          status: "FINAL",
          paymentSnapshotHash: HASH_A,
          exportManifestHash: HASH_B,
          freightSettlementHash: HASH_C,
          settlementPayloadCanonicalJson: '{"schemaVersion":"FREIGHT_SETTLEMENT_CANONICAL_V1"}',
        },
        deps
      );

      await assert.rejects(
        () =>
          upsertFreightSettlementRecord(
            {
              orderId: "ORD-300",
              settlementVersion: "v1",
              status: "FINAL",
              paymentSnapshotHash: HASH_D,
              exportManifestHash: HASH_B,
              freightSettlementHash: HASH_C,
              settlementPayloadCanonicalJson: '{"schemaVersion":"FREIGHT_SETTLEMENT_CANONICAL_V1"}',
            },
            deps
          ),
        /WRITE_ONCE_VIOLATION:paymentSnapshotHash/
      );

      await assert.rejects(
        () =>
          upsertFreightSettlementRecord(
            {
              orderId: "ORD-300",
              settlementVersion: "v1",
              status: "FINAL",
              paymentSnapshotHash: HASH_A,
              exportManifestHash: HASH_B,
              freightSettlementHash: HASH_D,
              settlementPayloadCanonicalJson: '{"schemaVersion":"FREIGHT_SETTLEMENT_CANONICAL_V1"}',
            },
            deps
          ),
        /WRITE_ONCE_VIOLATION:freightSettlementHash/
      );
    })
  );

  results.push(
    await runCheck("FREIGHT-CANONICAL-JSON-FINAL-ONLY", async () => {
      const collection = new MockCollection();
      const deps = buildFreightDeps(collection);

      await assert.rejects(
        () =>
          createFreightSettlementRecord(
            {
              orderId: "ORD-400",
              status: "DRAFT",
              settlementPayloadCanonicalJson: '{"schemaVersion":"FREIGHT_SETTLEMENT_CANONICAL_V1"}',
            },
            deps
          ),
        /FREIGHT_SETTLEMENT_CANONICAL_JSON_REQUIRES_FINAL/
      );

      await upsertFreightSettlementRecord(
        {
          orderId: "ORD-401",
          settlementVersion: "v1",
          status: "FINAL",
          paymentSnapshotHash: HASH_A,
          exportManifestHash: HASH_B,
          freightSettlementHash: HASH_C,
          settlementPayloadCanonicalJson: '{"schemaVersion":"FREIGHT_SETTLEMENT_CANONICAL_V1","totalAUD":100}',
        },
        deps
      );

      await assert.rejects(
        () =>
          upsertFreightSettlementRecord(
            {
              orderId: "ORD-401",
              settlementVersion: "v1",
              status: "FINAL",
              paymentSnapshotHash: HASH_A,
              exportManifestHash: HASH_B,
              freightSettlementHash: HASH_C,
              settlementPayloadCanonicalJson: '{"schemaVersion":"FREIGHT_SETTLEMENT_CANONICAL_V1","totalAUD":999}',
            },
            deps
          ),
        /WRITE_ONCE_VIOLATION:settlementPayloadCanonicalJson/
      );
    })
  );

  const failed = results.filter((result) => !result.pass);
  for (const result of results) {
    console.log(`[${result.pass ? "PASS" : "FAIL"}] ${result.id} :: ${result.details}`);
  }

  console.log(`SUMMARY total=${results.length} pass=${results.length - failed.length} fail=${failed.length}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
