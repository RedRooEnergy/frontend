import { buildPaymentIdempotencyKey, buildScopedPaymentIdempotencyKey } from "../../lib/payments/idempotencyStore";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function testDeterministicKeyBuilder() {
  const first = buildPaymentIdempotencyKey(["v1", "stripe", "ORDER-1", "create-session"]);
  const second = buildPaymentIdempotencyKey(["v1", "stripe", "ORDER-1", "create-session"]);
  assert(first === second, "Expected deterministic key output");
}

async function testLengthPrefixAvoidsSimpleCollisions() {
  const a = buildPaymentIdempotencyKey(["ab", "c"]);
  const b = buildPaymentIdempotencyKey(["a", "bc"]);
  assert(a !== b, "Expected different keys for different part boundaries");
}

async function testScopedKeyBuilderFormat() {
  const key = buildScopedPaymentIdempotencyKey({
    provider: "wise",
    scope: "WISE_TRANSFER_CREATE",
    tenantId: "tenant-1",
    orderId: "ORD-42",
    operation: "create-transfer",
    referenceId: "attempt-1",
    attemptClass: "manual-release",
  });

  const expected = buildPaymentIdempotencyKey([
    "v1",
    "wise",
    "WISE_TRANSFER_CREATE",
    "tenant-1",
    "ORD-42",
    "create-transfer",
    "attempt-1",
    "manual-release",
  ]);
  assert(key === expected, "Scoped key format mismatch");
}

async function testScopedKeyOrderSensitivity() {
  const first = buildScopedPaymentIdempotencyKey({
    provider: "stripe",
    scope: "STRIPE_REFUND_CREATE",
    tenantId: "tenant-1",
    orderId: "ORD-42",
    operation: "refund",
    referenceId: "r1",
    attemptClass: "default",
  });

  const second = buildScopedPaymentIdempotencyKey({
    provider: "stripe",
    scope: "STRIPE_REFUND_CREATE",
    tenantId: "tenant-1",
    orderId: "ORD-43",
    operation: "refund",
    referenceId: "r1",
    attemptClass: "default",
  });

  assert(first !== second, "Different orderId must produce different keys");
}

async function run() {
  await testDeterministicKeyBuilder();
  await testLengthPrefixAvoidsSimpleCollisions();
  await testScopedKeyBuilderFormat();
  await testScopedKeyOrderSensitivity();
}

run();
