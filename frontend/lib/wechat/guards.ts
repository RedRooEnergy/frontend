import { getWeChatEventMeta, isWeChatEventCode, type WeChatEventCode } from "./events";
import { buildDeterministicIdempotencyKey, canonicalPayloadHash } from "./hash";
import type { WeChatDispatchInput, WeChatEntityType } from "./types";

export function requireValidWeChatEventCode(eventCode: string): asserts eventCode is WeChatEventCode {
  if (!isWeChatEventCode(eventCode)) {
    throw new Error(`WECHAT_GOVERNANCE_VIOLATION: Unknown eventCode \"${eventCode}\"`);
  }
}

export function forbidRegulatorAutoSend(recipient: WeChatEntityType) {
  if (recipient === "ADMIN") return;
  if (recipient === "BUYER") return;
  if (recipient === "SUPPLIER") return;
  throw new Error("WECHAT_GOVERNANCE_VIOLATION: Unsupported recipient entity type");
}

export function requirePermittedRecipient(eventCode: WeChatEventCode, recipient: WeChatEntityType) {
  const meta = getWeChatEventMeta(eventCode);
  if (!meta.allowedRecipients.includes(recipient)) {
    throw new Error(`WECHAT_GOVERNANCE_VIOLATION: recipient \"${recipient}\" not permitted for ${eventCode}`);
  }
}

export function requireCorrelationContract(input: {
  eventCode: WeChatEventCode;
  correlation: WeChatDispatchInput["correlation"];
}) {
  const meta = getWeChatEventMeta(input.eventCode);
  const correlation = input.correlation || {};

  for (const requiredKey of meta.correlationKeys) {
    const value = correlation[requiredKey as keyof typeof correlation];
    if (!value || String(value).trim().length === 0) {
      throw new Error(`WECHAT_GOVERNANCE_VIOLATION: missing correlation.${requiredKey}`);
    }
  }
}

export function buildCorrelationKey(correlation: WeChatDispatchInput["correlation"]) {
  const payload = {
    bindingId: String(correlation.bindingId || "").trim() || null,
    complianceCaseId: String(correlation.complianceCaseId || "").trim() || null,
    orderId: String(correlation.orderId || "").trim() || null,
    paymentId: String(correlation.paymentId || "").trim() || null,
    productId: String(correlation.productId || "").trim() || null,
    shipmentId: String(correlation.shipmentId || "").trim() || null,
  };

  return canonicalPayloadHash(payload);
}

export function buildDispatchIdempotencyKey(input: {
  tenantId?: string | null;
  eventCode: WeChatEventCode;
  recipientBindingId: string;
  correlationKey: string;
  renderedPayloadHashSha256: string;
  retryOfDispatchId?: string | null;
  forceResend?: boolean;
}) {
  const canonicalPayloadHash = canonicalPayloadHashFn({
    eventCode: input.eventCode,
    recipientBindingId: String(input.recipientBindingId || "").trim(),
    correlationKey: String(input.correlationKey || "").trim(),
    renderedPayloadHashSha256: String(input.renderedPayloadHashSha256 || "").trim(),
    forceResend: input.forceResend === true,
    retryOfDispatchId: String(input.retryOfDispatchId || "").trim() || null,
  });

  return buildDeterministicIdempotencyKey({
    artifactClass: "wechat_dispatch",
    tenantId: input.tenantId || null,
    primaryKeyFields: [input.eventCode, input.recipientBindingId, input.correlationKey, input.retryOfDispatchId || ""],
    canonicalPayloadHash,
  });
}

function canonicalPayloadHashFn(value: unknown) {
  return canonicalPayloadHash(value);
}
