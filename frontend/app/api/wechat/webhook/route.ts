import { NextResponse } from "next/server";
import { resolveWeChatRuntimeConfig } from "../../../../lib/wechat/config";
import { processWeChatInboundWebhook } from "../../../../lib/wechat/webhookService";
import {
  parseWeChatWebhookPayload,
  verifyWeChatWebhookSignature,
} from "../../../../lib/wechat/webhook";

export const runtime = "nodejs";

function signatureParams(request: Request) {
  const url = new URL(request.url);
  return {
    signature:
      url.searchParams.get("signature") ||
      url.searchParams.get("msg_signature") ||
      request.headers.get("x-wechat-signature") ||
      "",
    timestamp: url.searchParams.get("timestamp") || request.headers.get("x-wechat-timestamp") || "",
    nonce: url.searchParams.get("nonce") || request.headers.get("x-wechat-nonce") || "",
  };
}

function verifyRequestSignature(request: Request, token: string) {
  const { signature, timestamp, nonce } = signatureParams(request);
  if (!verifyWeChatWebhookSignature({ token, signature, timestamp, nonce })) {
    throw new Error("WECHAT_WEBHOOK_SIGNATURE_INVALID");
  }
}

export async function GET(request: Request) {
  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled || !runtimeConfig.flags.webhookEnabled) {
    return NextResponse.json({ error: "WeChat webhook disabled" }, { status: 404 });
  }

  try {
    verifyRequestSignature(request, runtimeConfig.provider.webhookToken);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const url = new URL(request.url);
  const echo = url.searchParams.get("echostr") || "ok";
  return new NextResponse(echo, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function POST(request: Request) {
  const runtimeConfig = resolveWeChatRuntimeConfig();
  if (!runtimeConfig.flags.extensionEnabled || !runtimeConfig.flags.webhookEnabled) {
    return NextResponse.json({ error: "WeChat webhook disabled" }, { status: 404 });
  }

  try {
    verifyRequestSignature(request, runtimeConfig.provider.webhookToken);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const rawBody = await request.text();
  const payload = parseWeChatWebhookPayload(rawBody, request.headers.get("content-type"));

  const processed = await processWeChatInboundWebhook({
    payload,
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    received: true,
    processingResult: processed.processingResult,
    inboundId: processed.inbound.inboundId,
  });
}
