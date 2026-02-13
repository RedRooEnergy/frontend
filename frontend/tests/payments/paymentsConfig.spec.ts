import { resolvePaymentsRuntimeConfig, validatePaymentsRuntimeConfig } from "../../lib/payments/config";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function withEnv(overrides: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const snapshot = { ...process.env };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(snapshot)) {
      process.env[key] = value;
    }
  }
}

async function testProductionRejectsTestBundle() {
  await withEnv(
    {
      NODE_ENV: "production",
      ENABLE_STRIPE_HARDENED_FLOW: "true",
      STRIPE_SECRET_KEY_TEST: "sk_test_abc",
      STRIPE_WEBHOOK_SECRET_TEST: "whsec_test_abc",
      STRIPE_SECRET_KEY_LIVE: "sk_live_abc",
      STRIPE_WEBHOOK_SECRET_LIVE: "whsec_live_abc",
      ENABLE_WISE_HARDENED_FLOW: "false",
      WISE_SANDBOX_API_KEY: undefined,
      WISE_SANDBOX_PROFILE_ID: undefined,
      WISE_API_KEY_LIVE: undefined,
      WISE_PROFILE_ID_LIVE: undefined,
    },
    () => {
      let threw = false;
      try {
        validatePaymentsRuntimeConfig();
      } catch (error: any) {
        threw = true;
        assert(String(error?.message || "").includes("PAYMENTS_ENV_BUNDLE_MISMATCH"), "Expected bundle mismatch error");
      }
      assert(threw, "Expected production validation to reject test bundle");
    }
  );
}

async function testStripeHardenedRequiresWebhookSecret() {
  await withEnv(
    {
      NODE_ENV: "development",
      ENABLE_STRIPE_HARDENED_FLOW: "true",
      STRIPE_SECRET_KEY_TEST: "sk_test_abc",
      STRIPE_WEBHOOK_SECRET_TEST: undefined,
      ENABLE_WISE_HARDENED_FLOW: "false",
      WISE_SANDBOX_API_KEY: undefined,
      WISE_SANDBOX_PROFILE_ID: undefined,
      STRIPE_SECRET_KEY_LIVE: undefined,
      STRIPE_WEBHOOK_SECRET_LIVE: undefined,
      WISE_API_KEY_LIVE: undefined,
      WISE_PROFILE_ID_LIVE: undefined,
    },
    () => {
      let threw = false;
      try {
        validatePaymentsRuntimeConfig();
      } catch (error: any) {
        threw = true;
        assert(
          String(error?.message || "").includes("PAYMENTS_STRIPE_WEBHOOK_SECRET_REQUIRED"),
          "Expected missing stripe webhook secret error"
        );
      }
      assert(threw, "Expected stripe hardened flow validation to fail without webhook secret");
    }
  );
}

async function testWiseHardenedRequiresProfileId() {
  await withEnv(
    {
      NODE_ENV: "development",
      ENABLE_STRIPE_HARDENED_FLOW: "false",
      ENABLE_WISE_HARDENED_FLOW: "true",
      WISE_SANDBOX_API_KEY: "wise_sandbox_key",
      WISE_SANDBOX_PROFILE_ID: undefined,
      STRIPE_SECRET_KEY_TEST: undefined,
      STRIPE_WEBHOOK_SECRET_TEST: undefined,
      STRIPE_SECRET_KEY_LIVE: undefined,
      STRIPE_WEBHOOK_SECRET_LIVE: undefined,
      WISE_API_KEY_LIVE: undefined,
      WISE_PROFILE_ID_LIVE: undefined,
    },
    () => {
      let threw = false;
      try {
        validatePaymentsRuntimeConfig();
      } catch (error: any) {
        threw = true;
        assert(
          String(error?.message || "").includes("PAYMENTS_WISE_PROFILE_ID_REQUIRED"),
          "Expected missing wise profile id error"
        );
      }
      assert(threw, "Expected wise hardened flow validation to fail without profile id");
    }
  );
}

async function testResolveConfigDefaultsFlagsOff() {
  await withEnv(
    {
      NODE_ENV: "development",
      ENABLE_STRIPE_HARDENED_FLOW: undefined,
      ENABLE_WISE_HARDENED_FLOW: undefined,
      ENABLE_PAYMENTS_RECONCILIATION: undefined,
      ENABLE_PAYMENTS_METRICS: undefined,
      ENABLE_PAYMENTS_METRICS_ROUTE: undefined,
      STRIPE_SECRET_KEY_TEST: undefined,
      STRIPE_WEBHOOK_SECRET_TEST: undefined,
      WISE_SANDBOX_API_KEY: undefined,
      WISE_SANDBOX_PROFILE_ID: undefined,
      STRIPE_SECRET_KEY_LIVE: undefined,
      STRIPE_WEBHOOK_SECRET_LIVE: undefined,
      WISE_API_KEY_LIVE: undefined,
      WISE_PROFILE_ID_LIVE: undefined,
    },
    () => {
      const config = resolvePaymentsRuntimeConfig();
      assert(config.flags.stripeHardenedFlowEnabled === false, "Stripe hardened flag should default off");
      assert(config.flags.wiseHardenedFlowEnabled === false, "Wise hardened flag should default off");
      assert(config.flags.reconciliationEnabled === false, "Reconciliation flag should default off");
      assert(config.flags.metricsEnabled === false, "Metrics flag should default off");
      assert(config.flags.metricsRouteEnabled === false, "Metrics route flag should default off");
    }
  );
}

async function testValidNonProductionStripeBundle() {
  await withEnv(
    {
      NODE_ENV: "development",
      ENABLE_STRIPE_HARDENED_FLOW: "true",
      STRIPE_SECRET_KEY_TEST: "sk_test_abc",
      STRIPE_WEBHOOK_SECRET_TEST: "whsec_test_abc",
      ENABLE_WISE_HARDENED_FLOW: "false",
      WISE_SANDBOX_API_KEY: undefined,
      WISE_SANDBOX_PROFILE_ID: undefined,
      STRIPE_SECRET_KEY_LIVE: undefined,
      STRIPE_WEBHOOK_SECRET_LIVE: undefined,
      WISE_API_KEY_LIVE: undefined,
      WISE_PROFILE_ID_LIVE: undefined,
    },
    () => {
      const config = validatePaymentsRuntimeConfig();
      assert(config.stripe?.environment === "test", "Expected stripe environment test");
      assert(config.stripe?.secretKey === "sk_test_abc", "Unexpected stripe secret in resolved config");
    }
  );
}

async function run() {
  await testProductionRejectsTestBundle();
  await testStripeHardenedRequiresWebhookSecret();
  await testWiseHardenedRequiresProfileId();
  await testResolveConfigDefaultsFlagsOff();
  await testValidNonProductionStripeBundle();
}

run();
