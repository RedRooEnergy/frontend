import type { PaymentEnvironment } from "./types";

export type PaymentsRuntimeFlags = {
  stripeHardenedFlowEnabled: boolean;
  wiseHardenedFlowEnabled: boolean;
  reconciliationEnabled: boolean;
};

export type PaymentsStripeConfig = {
  environment: PaymentEnvironment;
  secretKey: string;
  webhookSecret: string;
};

export type PaymentsWiseConfig = {
  environment: PaymentEnvironment;
  apiKey: string;
  profileId: string;
};

export type PaymentsRuntimeConfig = {
  nodeEnv: string;
  isProduction: boolean;
  flags: PaymentsRuntimeFlags;
  stripe: PaymentsStripeConfig | null;
  wise: PaymentsWiseConfig | null;
};

function parseBooleanEnv(value: string | undefined) {
  return String(value || "").trim().toLowerCase() === "true";
}

function readTrimmed(value: string | undefined) {
  const next = String(value || "").trim();
  return next.length > 0 ? next : "";
}

export function resolvePaymentsRuntimeConfig(env: NodeJS.ProcessEnv = process.env): PaymentsRuntimeConfig {
  const nodeEnv = readTrimmed(env.NODE_ENV) || "development";
  const isProduction = nodeEnv === "production";

  const flags: PaymentsRuntimeFlags = {
    stripeHardenedFlowEnabled: parseBooleanEnv(env.ENABLE_STRIPE_HARDENED_FLOW),
    wiseHardenedFlowEnabled: parseBooleanEnv(env.ENABLE_WISE_HARDENED_FLOW),
    reconciliationEnabled: parseBooleanEnv(env.ENABLE_PAYMENTS_RECONCILIATION),
  };

  const stripeTestSecret = readTrimmed(env.STRIPE_SECRET_KEY_TEST);
  const stripeTestWebhook = readTrimmed(env.STRIPE_WEBHOOK_SECRET_TEST);
  const stripeLiveSecret = readTrimmed(env.STRIPE_SECRET_KEY_LIVE);
  const stripeLiveWebhook = readTrimmed(env.STRIPE_WEBHOOK_SECRET_LIVE);

  const wiseSandboxApiKey = readTrimmed(env.WISE_SANDBOX_API_KEY);
  const wiseSandboxProfileId = readTrimmed(env.WISE_SANDBOX_PROFILE_ID);
  const wiseLiveApiKey = readTrimmed(env.WISE_API_KEY_LIVE);
  const wiseLiveProfileId = readTrimmed(env.WISE_PROFILE_ID_LIVE);

  const stripe: PaymentsStripeConfig | null = isProduction
    ? stripeLiveSecret && stripeLiveWebhook
      ? { environment: "live", secretKey: stripeLiveSecret, webhookSecret: stripeLiveWebhook }
      : null
    : stripeTestSecret && stripeTestWebhook
    ? { environment: "test", secretKey: stripeTestSecret, webhookSecret: stripeTestWebhook }
    : null;

  const wise: PaymentsWiseConfig | null = isProduction
    ? wiseLiveApiKey && wiseLiveProfileId
      ? { environment: "live", apiKey: wiseLiveApiKey, profileId: wiseLiveProfileId }
      : null
    : wiseSandboxApiKey && wiseSandboxProfileId
    ? { environment: "test", apiKey: wiseSandboxApiKey, profileId: wiseSandboxProfileId }
    : null;

  return {
    nodeEnv,
    isProduction,
    flags,
    stripe,
    wise,
  };
}

function assertNoTestKeysInProduction(env: NodeJS.ProcessEnv) {
  const forbidden = ["STRIPE_SECRET_KEY_TEST", "STRIPE_WEBHOOK_SECRET_TEST", "WISE_SANDBOX_API_KEY", "WISE_SANDBOX_PROFILE_ID"];
  const found = forbidden.filter((key) => readTrimmed(env[key]).length > 0);
  if (found.length > 0) {
    throw new Error(`PAYMENTS_ENV_BUNDLE_MISMATCH: test credentials present in production (${found.join(",")})`);
  }
}

function assertStripeBundle(config: PaymentsRuntimeConfig, env: NodeJS.ProcessEnv) {
  if (!config.flags.stripeHardenedFlowEnabled) return;

  if (config.isProduction) {
    if (!readTrimmed(env.STRIPE_SECRET_KEY_LIVE)) {
      throw new Error("PAYMENTS_STRIPE_SECRET_KEY_REQUIRED: STRIPE_SECRET_KEY_LIVE missing");
    }
    if (!readTrimmed(env.STRIPE_WEBHOOK_SECRET_LIVE)) {
      throw new Error("PAYMENTS_STRIPE_WEBHOOK_SECRET_REQUIRED: STRIPE_WEBHOOK_SECRET_LIVE missing");
    }
    return;
  }

  if (!readTrimmed(env.STRIPE_SECRET_KEY_TEST)) {
    throw new Error("PAYMENTS_STRIPE_SECRET_KEY_REQUIRED: STRIPE_SECRET_KEY_TEST missing");
  }
  if (!readTrimmed(env.STRIPE_WEBHOOK_SECRET_TEST)) {
    throw new Error("PAYMENTS_STRIPE_WEBHOOK_SECRET_REQUIRED: STRIPE_WEBHOOK_SECRET_TEST missing");
  }
}

function assertWiseBundle(config: PaymentsRuntimeConfig, env: NodeJS.ProcessEnv) {
  if (!config.flags.wiseHardenedFlowEnabled) return;

  if (config.isProduction) {
    if (!readTrimmed(env.WISE_API_KEY_LIVE)) {
      throw new Error("PAYMENTS_WISE_API_KEY_REQUIRED: WISE_API_KEY_LIVE missing");
    }
    if (!readTrimmed(env.WISE_PROFILE_ID_LIVE)) {
      throw new Error("PAYMENTS_WISE_PROFILE_ID_REQUIRED: WISE_PROFILE_ID_LIVE missing");
    }
    return;
  }

  if (!readTrimmed(env.WISE_SANDBOX_API_KEY)) {
    throw new Error("PAYMENTS_WISE_API_KEY_REQUIRED: WISE_SANDBOX_API_KEY missing");
  }
  if (!readTrimmed(env.WISE_SANDBOX_PROFILE_ID)) {
    throw new Error("PAYMENTS_WISE_PROFILE_ID_REQUIRED: WISE_SANDBOX_PROFILE_ID missing");
  }
}

export function validatePaymentsRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const config = resolvePaymentsRuntimeConfig(env);

  if (config.isProduction) {
    assertNoTestKeysInProduction(env);
  }

  assertStripeBundle(config, env);
  assertWiseBundle(config, env);

  return config;
}
