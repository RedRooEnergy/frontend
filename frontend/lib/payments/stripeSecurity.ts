import crypto from "crypto";

export type VerifyStripeWebhookSignatureOptions = {
  toleranceSeconds?: number;
  nowUnixSeconds?: number;
};

function safeEqualHex(left: string, right: string) {
  const leftBuf = Buffer.from(String(left || ""), "utf8");
  const rightBuf = Buffer.from(String(right || ""), "utf8");
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function parseSignatureHeader(header: string) {
  const fields = String(header || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const timestampPart = fields.find((entry) => entry.startsWith("t="));
  const signatureParts = fields.filter((entry) => entry.startsWith("v1="));

  const timestamp = Number(timestampPart?.slice(2));
  const signatures = signatureParts.map((entry) => entry.slice(3)).filter(Boolean);

  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new Error("STRIPE_WEBHOOK_SIGNATURE_HEADER_INVALID");
  }

  return { timestamp, signatures };
}

export function verifyStripeWebhookSignature(payload: string, header: string, secret: string, options: VerifyStripeWebhookSignatureOptions = {}) {
  const { timestamp, signatures } = parseSignatureHeader(header);
  const toleranceSeconds = Number(options.toleranceSeconds ?? 300);
  const nowUnixSeconds = Number(options.nowUnixSeconds ?? Math.floor(Date.now() / 1000));

  if (!Number.isFinite(toleranceSeconds) || toleranceSeconds < 0) {
    throw new Error("STRIPE_WEBHOOK_TOLERANCE_INVALID");
  }

  if (Math.abs(nowUnixSeconds - timestamp) > toleranceSeconds) {
    throw new Error("STRIPE_WEBHOOK_TIMESTAMP_OUT_OF_TOLERANCE");
  }

  const expected = crypto
    .createHmac("sha256", String(secret || ""))
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const valid = signatures.some((signature) => safeEqualHex(signature, expected));
  if (!valid) {
    throw new Error("STRIPE_WEBHOOK_SIGNATURE_MISMATCH");
  }

  return {
    timestamp,
    toleranceSeconds,
  };
}
