import crypto from "crypto";
import { verifyStripeWebhookSignature } from "../../lib/payments/stripeSecurity";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildHeader(payload: string, secret: string, timestamp: number) {
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

async function testValidSignatureWithinTolerance() {
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const secret = "whsec_test_secret";
  const timestamp = 1_700_000_000;
  const header = buildHeader(payload, secret, timestamp);

  const result = verifyStripeWebhookSignature(payload, header, secret, {
    toleranceSeconds: 300,
    nowUnixSeconds: timestamp + 120,
  });

  assert(result.timestamp === timestamp, "Expected webhook verification to return parsed timestamp");
}

async function testOutOfToleranceRejected() {
  const payload = JSON.stringify({ id: "evt_2", type: "checkout.session.completed" });
  const secret = "whsec_test_secret";
  const timestamp = 1_700_000_000;
  const header = buildHeader(payload, secret, timestamp);

  let threw = false;
  try {
    verifyStripeWebhookSignature(payload, header, secret, {
      toleranceSeconds: 300,
      nowUnixSeconds: timestamp + 301,
    });
  } catch (error: any) {
    threw = true;
    assert(
      String(error?.message || "").includes("STRIPE_WEBHOOK_TIMESTAMP_OUT_OF_TOLERANCE"),
      "Expected timestamp out-of-tolerance error"
    );
  }

  assert(threw, "Expected verification to fail when event timestamp is stale");
}

async function testSignatureMismatchRejected() {
  const payload = JSON.stringify({ id: "evt_3", type: "checkout.session.completed" });
  const timestamp = 1_700_000_000;
  const validHeader = buildHeader(payload, "whsec_valid", timestamp);

  let threw = false;
  try {
    verifyStripeWebhookSignature(payload, validHeader, "whsec_other", {
      toleranceSeconds: 300,
      nowUnixSeconds: timestamp,
    });
  } catch (error: any) {
    threw = true;
    assert(
      String(error?.message || "").includes("STRIPE_WEBHOOK_SIGNATURE_MISMATCH"),
      "Expected signature mismatch error"
    );
  }

  assert(threw, "Expected verification to fail with wrong secret");
}

async function run() {
  await testValidSignatureWithinTolerance();
  await testOutOfToleranceRejected();
  await testSignatureMismatchRejected();
}

run();
