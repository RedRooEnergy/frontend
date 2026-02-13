import { mapStripeProviderError } from "../../lib/payments/providerErrors";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function testAuthMapping() {
  const mapped = mapStripeProviderError(401, JSON.stringify({ error: { type: "invalid_request_error", code: "api_key_expired" } }));
  assert(mapped.code === "PAYMENT_STRIPE_AUTH_FAILED", "Expected auth error mapping");
  assert(mapped.retryable === false, "Auth errors should not be retryable");
}

async function testRateLimitMapping() {
  const mapped = mapStripeProviderError(429, JSON.stringify({ error: { message: "Too many requests" } }));
  assert(mapped.code === "PAYMENT_STRIPE_RATE_LIMITED", "Expected rate-limit mapping");
  assert(mapped.retryable === true, "Rate-limit errors should be retryable");
}

async function testUpstreamMapping() {
  const mapped = mapStripeProviderError(500, "{}");
  assert(mapped.code === "PAYMENT_STRIPE_UPSTREAM_FAILURE", "Expected upstream mapping");
  assert(mapped.httpStatus === 502, "Expected upstream to map to 502 for caller");
}

async function run() {
  await testAuthMapping();
  await testRateLimitMapping();
  await testUpstreamMapping();
}

run();
