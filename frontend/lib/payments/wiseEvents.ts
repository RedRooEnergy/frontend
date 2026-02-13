function normalizePart(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "na";
}

export function deriveWiseProviderEventId(input: {
  incomingEventId?: string | null;
  transferId?: string | null;
  eventType: string;
  status: string;
  occurredAtUnix?: number | null;
  payloadHashSha256: string;
}) {
  const incomingEventId = String(input.incomingEventId || "").trim();
  if (incomingEventId) return incomingEventId;

  const transferId = normalizePart(String(input.transferId || ""));
  const eventType = normalizePart(String(input.eventType || "unknown"));
  const status = normalizePart(String(input.status || "unknown"));

  const occurredAtUnix = Number(input.occurredAtUnix || 0);
  if (Number.isFinite(occurredAtUnix) && occurredAtUnix > 0) {
    return `wise::${transferId}::${eventType}::${status}::${Math.floor(occurredAtUnix)}`;
  }

  const payloadHashSha256 = String(input.payloadHashSha256 || "").trim().toLowerCase();
  if (!payloadHashSha256) {
    throw new Error("payloadHashSha256 required when incomingEventId/occurredAtUnix missing");
  }

  return `wise::${transferId}::${eventType}::${status}::${payloadHashSha256}`;
}
