import { buildCanonicalPricingSnapshot, computeCanonicalPricingSnapshotHash, stableStringify } from "../../lib/payments/pricingSnapshot";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function testHashIsDeterministicAcrossItemOrdering() {
  const snapshotA = {
    orderId: "ORD-1",
    currency: "aud",
    totalAmountMinor: 21055,
    items: [
      { productSlug: "panel-a", supplierId: "sup-b", qty: 1, unitAmountMinor: 10025 },
      { productSlug: "panel-b", supplierId: "sup-a", qty: 2, unitAmountMinor: 5515 },
    ],
  };

  const snapshotB = {
    ...snapshotA,
    items: [...snapshotA.items].reverse(),
  };

  const hashA = computeCanonicalPricingSnapshotHash(snapshotA);
  const hashB = computeCanonicalPricingSnapshotHash(snapshotB);

  assert(hashA === hashB, "Expected stable hash regardless of item ordering");
}

async function testHashChangesWhenSnapshotChanges() {
  const snapshotA = {
    orderId: "ORD-2",
    currency: "aud",
    totalAmountMinor: 10000,
    items: [{ productSlug: "battery", supplierId: "sup-1", qty: 1, unitAmountMinor: 10000 }],
  };

  const snapshotB = {
    ...snapshotA,
    totalAmountMinor: 10100,
    items: [{ productSlug: "battery", supplierId: "sup-1", qty: 1, unitAmountMinor: 10100 }],
  };

  const hashA = computeCanonicalPricingSnapshotHash(snapshotA);
  const hashB = computeCanonicalPricingSnapshotHash(snapshotB);

  assert(hashA !== hashB, "Expected different hash when monetary snapshot changes");
}

async function testSnapshotCanonicalShape() {
  const snapshot = buildCanonicalPricingSnapshot({
    orderId: " ORD-3 ",
    currency: "nzd",
    totalAmountMinor: 999,
    items: [{ productSlug: "cable", supplierId: "sup-1", qty: 1, unitAmountMinor: 999 }],
  });

  const payload = stableStringify(snapshot);
  assert(payload.includes("\"currency\":\"NZD\""), "Expected normalized uppercase currency");
  assert(payload.includes("\"totalAmountMinor\":999"), "Expected exact minor-unit total");
}

async function testRejectsFloatingMinorUnitInput() {
  let threw = false;
  try {
    buildCanonicalPricingSnapshot({
      orderId: "ORD-4",
      currency: "aud",
      totalAmountMinor: 1000.5,
      items: [{ productSlug: "x", supplierId: "s", qty: 1, unitAmountMinor: 1000 }],
    });
  } catch (error: any) {
    threw = true;
    assert(
      String(error?.message || "").includes("totalAmountMinor must be integer minor units"),
      "Expected integer minor-unit validation error"
    );
  }

  assert(threw, "Expected floating minor unit totals to be rejected");
}

async function run() {
  await testHashIsDeterministicAcrossItemOrdering();
  await testHashChangesWhenSnapshotChanges();
  await testSnapshotCanonicalShape();
  await testRejectsFloatingMinorUnitInput();
}

run();
