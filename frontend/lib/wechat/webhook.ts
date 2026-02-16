import crypto from "crypto";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sha1Hex(value: string) {
  return crypto.createHash("sha1").update(value, "utf8").digest("hex");
}

export function verifyWeChatWebhookSignature(input: {
  token: string;
  signature: string;
  timestamp: string;
  nonce: string;
}) {
  const token = String(input.token || "").trim();
  const signature = String(input.signature || "").trim().toLowerCase();
  const timestamp = String(input.timestamp || "").trim();
  const nonce = String(input.nonce || "").trim();

  if (!token || !signature || !timestamp || !nonce) return false;

  const candidate = sha1Hex([token, timestamp, nonce].sort().join(""));
  return safeEqual(signature, candidate);
}

function parseXmlBody(rawBody: string) {
  const payload: Record<string, unknown> = {};
  const cdataRegex = /<([A-Za-z0-9_]+)><!\[CDATA\[(.*?)\]\]><\/\1>/g;
  const textRegex = /<([A-Za-z0-9_]+)>([^<]+)<\/\1>/g;

  let match: RegExpExecArray | null;
  while ((match = cdataRegex.exec(rawBody)) !== null) {
    payload[match[1]] = match[2];
  }

  while ((match = textRegex.exec(rawBody)) !== null) {
    if (Object.prototype.hasOwnProperty.call(payload, match[1])) continue;
    payload[match[1]] = match[2];
  }

  return payload;
}

export function parseWeChatWebhookPayload(rawBody: string, contentType: string | null) {
  const type = String(contentType || "").toLowerCase();

  if (type.includes("application/json")) {
    try {
      const parsed = JSON.parse(rawBody || "{}") as Record<string, unknown>;
      return parsed;
    } catch {
      return {};
    }
  }

  return parseXmlBody(rawBody || "");
}

export function extractWeChatInboundContext(payload: Record<string, unknown>) {
  const msgType = String(payload.MsgType || payload.msgType || "").trim().toLowerCase();
  const event = String(payload.Event || payload.event || "").trim().toUpperCase();
  const eventKey = String(payload.EventKey || payload.eventKey || "").trim();
  const fromUserName = String(payload.FromUserName || payload.fromUserName || payload.openid || "").trim();
  const msgId = String(payload.MsgId || payload.msgId || payload.messageId || "").trim();

  return {
    msgType,
    event,
    eventKey,
    fromUserName,
    msgId: msgId || null,
  };
}
