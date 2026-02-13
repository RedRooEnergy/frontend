export type WiseProviderErrorClass =
  | "AUTH"
  | "RATE_LIMIT"
  | "VALIDATION"
  | "CONFLICT"
  | "TRANSIENT"
  | "UPSTREAM"
  | "PROVIDER_TERMINAL"
  | "TIMEOUT"
  | "UNKNOWN";

export type WiseProviderError = {
  provider: "wise";
  code: string;
  class: WiseProviderErrorClass;
  retryable: boolean;
  httpStatus: number;
  providerStatus?: number;
  providerCode?: string;
  message?: string;
};

function parseWiseErrorBody(input: string) {
  try {
    const parsed = JSON.parse(input);
    return {
      message: typeof parsed?.message === "string" ? parsed.message : "",
      providerCode:
        typeof parsed?.errorCode === "string"
          ? parsed.errorCode
          : typeof parsed?.code === "string"
          ? parsed.code
          : "",
    };
  } catch {
    return {
      message: "",
      providerCode: "",
    };
  }
}

export function mapWiseProviderError(providerStatus: number | undefined, rawBody: string | undefined): WiseProviderError {
  const details = parseWiseErrorBody(String(rawBody || ""));
  const status = Number(providerStatus || 500);

  if (status === 401 || status === 403) {
    return {
      provider: "wise",
      code: "WISE_AUTH_FAILED",
      class: "AUTH",
      retryable: false,
      httpStatus: 502,
      providerStatus: status,
      providerCode: details.providerCode || undefined,
      message: details.message || "Wise authentication failed",
    };
  }

  if (status === 400 || status === 422) {
    return {
      provider: "wise",
      code: "WISE_VALIDATION_FAILED",
      class: "VALIDATION",
      retryable: false,
      httpStatus: 400,
      providerStatus: status,
      providerCode: details.providerCode || undefined,
      message: details.message || "Wise validation failed",
    };
  }

  if (status === 409) {
    return {
      provider: "wise",
      code: "WISE_CONFLICT_DUPLICATE",
      class: "CONFLICT",
      retryable: false,
      httpStatus: 409,
      providerStatus: status,
      providerCode: details.providerCode || undefined,
      message: details.message || "Wise conflict",
    };
  }

  if (status === 429) {
    return {
      provider: "wise",
      code: "WISE_RATE_LIMITED",
      class: "RATE_LIMIT",
      retryable: true,
      httpStatus: 503,
      providerStatus: status,
      providerCode: details.providerCode || undefined,
      message: details.message || "Wise rate limited",
    };
  }

  if (status >= 500) {
    return {
      provider: "wise",
      code: "WISE_UPSTREAM_FAILURE",
      class: "UPSTREAM",
      retryable: true,
      httpStatus: 502,
      providerStatus: status,
      providerCode: details.providerCode || undefined,
      message: details.message || "Wise upstream failure",
    };
  }

  return {
    provider: "wise",
    code: "WISE_UNKNOWN_ERROR",
    class: "UNKNOWN",
    retryable: false,
    httpStatus: 500,
    providerStatus: status,
    providerCode: details.providerCode || undefined,
    message: details.message || "Wise error",
  };
}
