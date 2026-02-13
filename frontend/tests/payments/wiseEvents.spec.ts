import { deriveWiseProviderEventId } from "../../lib/payments/wiseEvents";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function testUsesIncomingEventIdWhenPresent() {
  const eventId = deriveWiseProviderEventId({
    incomingEventId: "wise_evt_123",
    transferId: "tr_1",
    eventType: "transfer.updated",
    status: "outgoing_payment_sent",
    occurredAtUnix: 1710000000,
    payloadHashSha256: "a".repeat(64),
  });

  assert(eventId === "wise_evt_123", "Incoming Wise event id should be preferred");
}

async function testDerivesWithOccurredAtWhenNoIncomingId() {
  const eventId = deriveWiseProviderEventId({
    transferId: "tr_1",
    eventType: "transfer.updated",
    status: "outgoing_payment_sent",
    occurredAtUnix: 1710000000,
    payloadHashSha256: "b".repeat(64),
  });

  assert(
    eventId === "wise::tr_1::transfer.updated::outgoing_payment_sent::1710000000",
    "Expected deterministic Wise event id with occurredAt"
  );
}

async function testFallsBackToPayloadHashWhenTimestampMissing() {
  const eventId = deriveWiseProviderEventId({
    transferId: "tr_1",
    eventType: "transfer.updated",
    status: "processing",
    payloadHashSha256: "c".repeat(64),
  });

  assert(
    eventId === `wise::tr_1::transfer.updated::processing::${"c".repeat(64)}`,
    "Expected deterministic Wise event id with payload hash fallback"
  );
}

async function run() {
  await testUsesIncomingEventIdWhenPresent();
  await testDerivesWithOccurredAtWhenNoIncomingId();
  await testFallsBackToPayloadHashWhenTimestampMissing();
}

run();
