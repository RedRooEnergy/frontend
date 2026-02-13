import {
  acquirePaymentIdempotencyLock,
  buildScopedPaymentIdempotencyKey,
  getPaymentIdempotencyRecord,
  markPaymentIdempotencyResult,
  type IdempotencyStoreDependencies,
} from "../../lib/payments/idempotencyStore";
import type { PaymentIdempotencyRecord } from "../../lib/payments/types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function matchesQuery(record: Record<string, any>, query: Record<string, unknown>) {
  for (const [key, value] of Object.entries(query)) {
    if (record[key] !== value) return false;
  }
  return true;
}

function createMemoryDependencies() {
  const rows: PaymentIdempotencyRecord[] = [];

  const collection = {
    async createIndex() {
      return;
    },
    async insertOne(doc: any) {
      const duplicate = rows.find(
        (row) => row.provider === doc.provider && row.scope === doc.scope && row.key === doc.key
      );
      if (duplicate) {
        const err: any = new Error("duplicate key");
        err.code = 11000;
        throw err;
      }
      const next = { ...doc, _id: `${rows.length + 1}` };
      rows.push(next);
      return { insertedId: next._id };
    },
    async findOne(query: Record<string, unknown>) {
      return rows.find((row) => matchesQuery(row as any, query)) || null;
    },
    async findOneAndUpdate(query: Record<string, unknown>, update: Record<string, unknown>) {
      const index = rows.findIndex((row) => matchesQuery(row as any, query));
      if (index === -1) return null;
      const setFields = (update as any).$set || {};
      rows[index] = {
        ...rows[index],
        ...setFields,
      };
      return rows[index];
    },
  };

  const deps: Partial<IdempotencyStoreDependencies> = {
    getCollection: async () => collection as any,
    now: () => new Date("2026-02-12T12:00:00.000Z"),
  };

  return { deps, rows };
}

async function testAcquireAndConflictSemantics() {
  const { deps } = createMemoryDependencies();
  const key = buildScopedPaymentIdempotencyKey({
    provider: "wise",
    scope: "WISE_TRANSFER_CREATE",
    tenantId: "tenant-a",
    orderId: "ORD-1",
    operation: "create-transfer",
    referenceId: "attempt-1",
    attemptClass: "manual",
  });

  const first = await acquirePaymentIdempotencyLock(
    {
      provider: "wise",
      scope: "WISE_TRANSFER_CREATE",
      key,
      operation: "create-transfer",
      tenantId: "tenant-a",
      orderId: "ORD-1",
    },
    deps
  );
  assert(first.acquired === true, "First lock should be acquired");

  const second = await acquirePaymentIdempotencyLock(
    {
      provider: "wise",
      scope: "WISE_TRANSFER_CREATE",
      key,
      operation: "create-transfer",
      tenantId: "tenant-a",
      orderId: "ORD-1",
    },
    deps
  );
  assert(second.acquired === false, "Second lock should be deduped");
  assert(second.record._id === first.record._id, "Expected same stored record for duplicate lock");
}

async function testMarkResultAndReadback() {
  const { deps } = createMemoryDependencies();
  const key = buildScopedPaymentIdempotencyKey({
    provider: "stripe",
    scope: "STRIPE_REFUND_CREATE",
    tenantId: "tenant-a",
    orderId: "ORD-2",
    operation: "refund",
    referenceId: "refund-1",
    attemptClass: "buyer",
  });

  await acquirePaymentIdempotencyLock(
    {
      provider: "stripe",
      scope: "STRIPE_REFUND_CREATE",
      key,
      operation: "refund",
      tenantId: "tenant-a",
      orderId: "ORD-2",
      requestHashSha256: "a".repeat(64),
    },
    deps
  );

  const marked = await markPaymentIdempotencyResult(
    {
      provider: "stripe",
      scope: "STRIPE_REFUND_CREATE",
      key,
      status: "SUCCEEDED",
      responseHashSha256: "b".repeat(64),
      metadata: { refundId: "re_1" },
    },
    deps
  );
  assert(marked.status === "SUCCEEDED", "Expected SUCCEEDED status");

  const found = await getPaymentIdempotencyRecord(
    {
      provider: "stripe",
      scope: "STRIPE_REFUND_CREATE",
      key,
    },
    deps
  );

  assert(found?.status === "SUCCEEDED", "Expected persisted SUCCEEDED status");
  assert(found?.responseHashSha256 === "b".repeat(64), "Expected persisted response hash");
}

async function testScopeIsolation() {
  const { deps } = createMemoryDependencies();
  const key = "same-key";

  const first = await acquirePaymentIdempotencyLock(
    {
      provider: "stripe",
      scope: "STRIPE_CHECKOUT_SESSION_CREATE",
      key,
      operation: "create-session",
    },
    deps
  );

  const second = await acquirePaymentIdempotencyLock(
    {
      provider: "stripe",
      scope: "STRIPE_REFUND_CREATE",
      key,
      operation: "refund",
    },
    deps
  );

  assert(first.acquired === true, "Expected first scope lock acquired");
  assert(second.acquired === true, "Expected second scope lock acquired");
}

async function run() {
  await testAcquireAndConflictSemantics();
  await testMarkResultAndReadback();
  await testScopeIsolation();
}

run();
