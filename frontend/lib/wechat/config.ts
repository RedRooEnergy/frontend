export type WeChatRuntimeConfig = {
  flags: {
    extensionEnabled: boolean;
    webhookEnabled: boolean;
  };
  provider: {
    mode: "dev" | "http";
    appId: string;
    endpoint: string;
    accessToken: string;
    webhookToken: string;
  };
  verification: {
    linkBaseUrl: string;
    tokenTtlMinutes: number;
  };
};

function parseBoolean(value: string | undefined) {
  return String(value || "").trim().toLowerCase() === "true";
}

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function resolveWeChatRuntimeConfig(env: NodeJS.ProcessEnv = process.env): WeChatRuntimeConfig {
  const extensionEnabled = parseBoolean(env.ENABLE_WECHAT_EXTENSION);
  const webhookEnabled = parseBoolean(env.ENABLE_WECHAT_WEBHOOK);

  const mode = String(env.WECHAT_PROVIDER_MODE || "dev").trim().toLowerCase() === "http" ? "http" : "dev";
  const appId = String(env.WECHAT_APP_ID || "rre-wechat-official-account").trim();
  const endpoint = String(env.WECHAT_API_ENDPOINT || "").trim();
  const accessToken = String(env.WECHAT_ACCESS_TOKEN || "").trim();
  const webhookToken = String(env.WECHAT_WEBHOOK_TOKEN || "").trim();

  const linkBaseUrl = String(env.WECHAT_BIND_LINK_BASE_URL || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
  const tokenTtlMinutes = parseNumber(env.WECHAT_BIND_TOKEN_TTL_MINUTES, 30);

  if (mode === "http" && extensionEnabled) {
    if (!endpoint) throw new Error("WECHAT_RUNTIME_INVALID: WECHAT_API_ENDPOINT required in http mode");
    if (!accessToken) throw new Error("WECHAT_RUNTIME_INVALID: WECHAT_ACCESS_TOKEN required in http mode");
  }

  if (webhookEnabled && extensionEnabled && !webhookToken) {
    throw new Error("WECHAT_RUNTIME_INVALID: WECHAT_WEBHOOK_TOKEN required when webhook enabled");
  }

  return {
    flags: {
      extensionEnabled,
      webhookEnabled,
    },
    provider: {
      mode,
      appId,
      endpoint,
      accessToken,
      webhookToken,
    },
    verification: {
      linkBaseUrl,
      tokenTtlMinutes,
    },
  };
}
