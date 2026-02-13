import crypto from "crypto";

export const WISE_IDEMPOTENCY_UUID_NAMESPACE_V1 = "2f4f6e7a-4f2a-5d0f-9ef0-8f6d5c4b3a21";

function uuidToBytes(uuid: string) {
  const clean = String(uuid || "").toLowerCase().replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/.test(clean)) {
    throw new Error("WISE_UUID_NAMESPACE_INVALID");
  }
  return Buffer.from(clean, "hex");
}

function bytesToUuid(bytes: Uint8Array) {
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Deterministic UUID v5 generator used for Wise `X-idempotence-uuid`.
 *
 * - namespace: fixed `WISE_IDEMPOTENCY_UUID_NAMESPACE_V1`
 * - name: deterministic scoped idempotency key string
 */
export function uuidV5(name: string, namespace: string = WISE_IDEMPOTENCY_UUID_NAMESPACE_V1) {
  const nsBytes = uuidToBytes(namespace);
  const nameBytes = Buffer.from(String(name || ""), "utf8");
  const hash = crypto.createHash("sha1").update(Buffer.concat([nsBytes, nameBytes])).digest();

  const bytes = Buffer.from(hash.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}

export function buildWiseTransferReferenceId(input: {
  releaseAttemptId: string;
  wiseProfileId: string;
  destinationType: string;
}) {
  const releaseAttemptId = String(input.releaseAttemptId || "").trim();
  const wiseProfileId = String(input.wiseProfileId || "").trim();
  const destinationType = String(input.destinationType || "supplier_payout").trim().toLowerCase();

  if (!releaseAttemptId) throw new Error("releaseAttemptId required");
  if (!wiseProfileId) throw new Error("wiseProfileId required");
  if (!destinationType) throw new Error("destinationType required");

  return `${releaseAttemptId}:${wiseProfileId}:${destinationType}`;
}
