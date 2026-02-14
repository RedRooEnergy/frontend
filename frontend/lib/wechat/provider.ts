import type { WeChatDispatchProviderStatus } from "./types";

export type WeChatProviderSendPayload = {
  toUserId: string;
  appId: string;
  eventCode: string;
  templateId: string;
  language: string;
  renderedPayload: string;
};

export type WeChatProviderSendResult = {
  providerRequestId: string | null;
  providerStatus: WeChatDispatchProviderStatus;
  providerResponseRedacted: Record<string, unknown> | null;
  providerErrorCode: string | null;
};

export interface WeChatProviderAdapter {
  sendTemplateMessage(payload: WeChatProviderSendPayload): Promise<WeChatProviderSendResult>;
}

function redactProviderResponse(input: Record<string, unknown>) {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input || {})) {
    const keyLc = key.toLowerCase();
    if (keyLc.includes("token") || keyLc.includes("secret") || keyLc.includes("signature")) {
      redacted[key] = "[REDACTED]";
      continue;
    }
    redacted[key] = value;
  }
  return redacted;
}

export class DevWeChatProviderAdapter implements WeChatProviderAdapter {
  async sendTemplateMessage(payload: WeChatProviderSendPayload): Promise<WeChatProviderSendResult> {
    // eslint-disable-next-line no-console
    console.log("[wechat:dev]", {
      toUserId: payload.toUserId,
      eventCode: payload.eventCode,
      templateId: payload.templateId,
    });

    return {
      providerRequestId: `wechat-dev-${Date.now()}`,
      providerStatus: "SENT",
      providerResponseRedacted: {
        mode: "dev",
        eventCode: payload.eventCode,
      },
      providerErrorCode: null,
    };
  }
}

export class HttpWeChatProviderAdapter implements WeChatProviderAdapter {
  constructor(
    private readonly endpoint: string,
    private readonly accessToken: string
  ) {}

  async sendTemplateMessage(payload: WeChatProviderSendPayload): Promise<WeChatProviderSendResult> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        touser: payload.toUserId,
        template_id: payload.templateId,
        lang: payload.language,
        data: {
          message: payload.renderedPayload,
        },
      }),
    });

    const responseText = await response.text();
    let parsed: Record<string, unknown> = { raw: responseText };
    try {
      parsed = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      parsed = { raw: responseText };
    }

    const providerRequestId = String(parsed.msgid || parsed.requestId || parsed.id || "").trim() || null;
    const errorCode = response.ok ? null : String(parsed.errcode || parsed.code || "WECHAT_PROVIDER_HTTP_ERROR");

    return {
      providerRequestId,
      providerStatus: response.ok ? "SENT" : "FAILED",
      providerResponseRedacted: redactProviderResponse(parsed),
      providerErrorCode: errorCode,
    };
  }
}

export function createWeChatProviderAdapter(input: {
  mode: "dev" | "http";
  endpoint: string;
  accessToken: string;
}): WeChatProviderAdapter {
  if (input.mode === "http") {
    return new HttpWeChatProviderAdapter(input.endpoint, input.accessToken);
  }
  return new DevWeChatProviderAdapter();
}
