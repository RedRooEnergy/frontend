import { WISE_IDEMPOTENCY_UUID_NAMESPACE_V1, buildWiseTransferReferenceId, uuidV5 } from "../../lib/payments/wiseIdentity";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function testUuidV5Deterministic() {
  const key = "2:v1|4:wise|20:WISE_TRANSFER_CREATE|0:|6:ORD-42|22:create_transfer_intent|33:attempt-1:123:supplier_payout|9:phase3_v1";
  const first = uuidV5(key, WISE_IDEMPOTENCY_UUID_NAMESPACE_V1);
  const second = uuidV5(key, WISE_IDEMPOTENCY_UUID_NAMESPACE_V1);

  assert(first === second, "UUID v5 should be deterministic for same namespace/name");
  assert(first.length === 36, "UUID v5 output must be canonical UUID length");
  assert(first[14] === "5", "UUID version nibble must be 5");
}

async function testReferenceIdNoAccountIdentifiers() {
  const referenceId = buildWiseTransferReferenceId({
    releaseAttemptId: "attempt-2",
    wiseProfileId: "profile-123",
    destinationType: "supplier_payout",
  });

  assert(referenceId === "attempt-2:profile-123:supplier_payout", "Unexpected Wise transfer reference id format");
}

async function run() {
  await testUuidV5Deterministic();
  await testReferenceIdNoAccountIdentifiers();
}

run();
