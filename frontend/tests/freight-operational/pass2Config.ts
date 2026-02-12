export type Pass2Mode = "static" | "integration";

export type Pass2Config = {
  mode: Pass2Mode;
  baseUrl: string;
  testOrderId: string;
  integrationEnabled: boolean;
};

function normalizeBaseUrl(raw: string) {
  return raw.replace(/\/+$/, "");
}

export function loadPass2Config(): Pass2Config {
  const rawMode = (process.env.PASS2_MODE || "").trim().toLowerCase();
  const rawBaseUrl = (process.env.PASS2_BASE_URL || "").trim();
  const rawOrderId = (process.env.PASS2_TEST_ORDER_ID || "").trim();

  let mode: Pass2Mode;
  if (!rawMode) {
    mode = rawBaseUrl ? "integration" : "static";
  } else if (rawMode === "static" || rawMode === "integration") {
    mode = rawMode;
  } else {
    throw new Error(`Invalid PASS2_MODE value: ${rawMode}. Use static or integration.`);
  }

  const baseUrl = rawBaseUrl ? normalizeBaseUrl(rawBaseUrl) : "";
  const testOrderId = rawOrderId;

  if (mode === "integration") {
    if (!baseUrl) {
      throw new Error("PASS2_BASE_URL is required in integration mode.");
    }
    if (!testOrderId) {
      throw new Error("PASS2_TEST_ORDER_ID is required in integration mode.");
    }
  }

  return {
    mode,
    baseUrl,
    testOrderId,
    integrationEnabled: mode === "integration" && Boolean(baseUrl) && Boolean(testOrderId),
  };
}
