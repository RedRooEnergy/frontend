import type { WeChatClassification, WeChatEntityType, WeChatRetentionClass } from "./types";

export const WECHAT_EVENTS = {
  ORDER_CREATED_NOTIFY_V1: "WECHAT.ORDER.CREATED.NOTIFY.V1",
  ORDER_DOCS_REQUIRED_PROMPT_V1: "WECHAT.ORDER.DOCS_REQUIRED.PROMPT.V1",
  ORDER_DISPATCH_REQUIRED_PROMPT_V1: "WECHAT.ORDER.DISPATCH_REQUIRED.PROMPT.V1",
  ORDER_DELIVERY_CONFIRMED_NOTIFY_V1: "WECHAT.ORDER.DELIVERY_CONFIRMED.NOTIFY.V1",

  COMPLIANCE_CERT_REQUIRED_PROMPT_V1: "WECHAT.COMPLIANCE.CERT_REQUIRED.PROMPT.V1",
  COMPLIANCE_SUBMISSION_READY_PROMPT_V1: "WECHAT.COMPLIANCE.SUBMISSION_READY.PROMPT.V1",
  COMPLIANCE_SUBMITTED_STATUS_V1: "WECHAT.COMPLIANCE.SUBMITTED.STATUS.V1",
  COMPLIANCE_REWORK_REQUIRED_PROMPT_V1: "WECHAT.COMPLIANCE.REWORK_REQUIRED.PROMPT.V1",

  FREIGHT_BOOKING_REQUIRED_PROMPT_V1: "WECHAT.FREIGHT.BOOKING_REQUIRED.PROMPT.V1",
  FREIGHT_DOCUMENTS_REQUIRED_PROMPT_V1: "WECHAT.FREIGHT.DOCUMENTS_REQUIRED.PROMPT.V1",
  FREIGHT_CUSTOMS_HOLD_ALERT_V1: "WECHAT.FREIGHT.CUSTOMS_HOLD.ALERT.V1",
  FREIGHT_DELIVERED_NOTIFY_V1: "WECHAT.FREIGHT.DELIVERED.NOTIFY.V1",

  PAYMENT_ACTION_REQUIRED_PROMPT_V1: "WECHAT.PAYMENT.ACTION_REQUIRED.PROMPT.V1",
  PAYMENT_RECEIVED_CONFIRM_V1: "WECHAT.PAYMENT.RECEIVED.CONFIRM.V1",
  PAYMENT_REFUND_INITIATED_NOTIFY_V1: "WECHAT.PAYMENT.REFUND_INITIATED.NOTIFY.V1",

  ACCOUNT_BINDING_VERIFIED_CONFIRM_V1: "WECHAT.ACCOUNT.BINDING_VERIFIED.CONFIRM.V1",
  ACCOUNT_BINDING_REVOKED_NOTIFY_V1: "WECHAT.ACCOUNT.BINDING_REVOKED.NOTIFY.V1",
} as const;

export type WeChatEventCode = (typeof WECHAT_EVENTS)[keyof typeof WECHAT_EVENTS];

export type WeChatEventMeta = {
  classification: WeChatClassification;
  retentionClass: WeChatRetentionClass;
  allowedRecipients: WeChatEntityType[];
  correlationKeys: Array<"orderId" | "complianceCaseId" | "shipmentId" | "paymentId" | "productId" | "bindingId">;
  replyExpected: boolean;
  requiredPlaceholders: string[];
};

export const WECHAT_EVENT_META: Record<WeChatEventCode, WeChatEventMeta> = {
  [WECHAT_EVENTS.ORDER_CREATED_NOTIFY_V1]: {
    classification: "OPERATIONAL",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["orderId"],
    replyExpected: false,
    requiredPlaceholders: ["orderId", "actionUrl"],
  },
  [WECHAT_EVENTS.ORDER_DOCS_REQUIRED_PROMPT_V1]: {
    classification: "OPERATIONAL",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["orderId"],
    replyExpected: false,
    requiredPlaceholders: ["orderId", "actionUrl", "requiredDocuments"],
  },
  [WECHAT_EVENTS.ORDER_DISPATCH_REQUIRED_PROMPT_V1]: {
    classification: "OPERATIONAL",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["orderId"],
    replyExpected: false,
    requiredPlaceholders: ["orderId", "actionUrl"],
  },
  [WECHAT_EVENTS.ORDER_DELIVERY_CONFIRMED_NOTIFY_V1]: {
    classification: "OPERATIONAL",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["orderId"],
    replyExpected: false,
    requiredPlaceholders: ["orderId", "actionUrl"],
  },

  [WECHAT_EVENTS.COMPLIANCE_CERT_REQUIRED_PROMPT_V1]: {
    classification: "COMPLIANCE",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["complianceCaseId", "productId"],
    replyExpected: false,
    requiredPlaceholders: ["complianceCaseId", "actionUrl", "requiredCerts"],
  },
  [WECHAT_EVENTS.COMPLIANCE_SUBMISSION_READY_PROMPT_V1]: {
    classification: "COMPLIANCE",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["complianceCaseId"],
    replyExpected: false,
    requiredPlaceholders: ["complianceCaseId", "actionUrl"],
  },
  [WECHAT_EVENTS.COMPLIANCE_SUBMITTED_STATUS_V1]: {
    classification: "COMPLIANCE",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["complianceCaseId"],
    replyExpected: false,
    requiredPlaceholders: ["complianceCaseId", "actionUrl"],
  },
  [WECHAT_EVENTS.COMPLIANCE_REWORK_REQUIRED_PROMPT_V1]: {
    classification: "COMPLIANCE",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["complianceCaseId"],
    replyExpected: false,
    requiredPlaceholders: ["complianceCaseId", "actionUrl", "missingFields"],
  },

  [WECHAT_EVENTS.FREIGHT_BOOKING_REQUIRED_PROMPT_V1]: {
    classification: "FREIGHT",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["shipmentId", "orderId"],
    replyExpected: false,
    requiredPlaceholders: ["shipmentId", "orderId", "actionUrl"],
  },
  [WECHAT_EVENTS.FREIGHT_DOCUMENTS_REQUIRED_PROMPT_V1]: {
    classification: "FREIGHT",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["shipmentId"],
    replyExpected: false,
    requiredPlaceholders: ["shipmentId", "actionUrl", "missingDocuments"],
  },
  [WECHAT_EVENTS.FREIGHT_CUSTOMS_HOLD_ALERT_V1]: {
    classification: "FREIGHT",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER", "ADMIN"],
    correlationKeys: ["shipmentId"],
    replyExpected: false,
    requiredPlaceholders: ["shipmentId", "actionUrl"],
  },
  [WECHAT_EVENTS.FREIGHT_DELIVERED_NOTIFY_V1]: {
    classification: "FREIGHT",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER", "BUYER"],
    correlationKeys: ["shipmentId", "orderId"],
    replyExpected: false,
    requiredPlaceholders: ["shipmentId", "orderId", "actionUrl"],
  },

  [WECHAT_EVENTS.PAYMENT_ACTION_REQUIRED_PROMPT_V1]: {
    classification: "PAYMENT",
    retentionClass: "7Y",
    allowedRecipients: ["BUYER", "ADMIN"],
    correlationKeys: ["paymentId", "orderId"],
    replyExpected: false,
    requiredPlaceholders: ["paymentId", "orderId", "actionUrl"],
  },
  [WECHAT_EVENTS.PAYMENT_RECEIVED_CONFIRM_V1]: {
    classification: "PAYMENT",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["paymentId", "orderId"],
    replyExpected: false,
    requiredPlaceholders: ["paymentId", "orderId", "actionUrl"],
  },
  [WECHAT_EVENTS.PAYMENT_REFUND_INITIATED_NOTIFY_V1]: {
    classification: "PAYMENT",
    retentionClass: "7Y",
    allowedRecipients: ["BUYER", "ADMIN"],
    correlationKeys: ["paymentId", "orderId"],
    replyExpected: false,
    requiredPlaceholders: ["paymentId", "orderId", "actionUrl"],
  },

  [WECHAT_EVENTS.ACCOUNT_BINDING_VERIFIED_CONFIRM_V1]: {
    classification: "ACCOUNT",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["bindingId"],
    replyExpected: false,
    requiredPlaceholders: ["bindingId", "actionUrl"],
  },
  [WECHAT_EVENTS.ACCOUNT_BINDING_REVOKED_NOTIFY_V1]: {
    classification: "ACCOUNT",
    retentionClass: "7Y",
    allowedRecipients: ["SUPPLIER"],
    correlationKeys: ["bindingId"],
    replyExpected: false,
    requiredPlaceholders: ["bindingId", "actionUrl"],
  },
};

export function isWeChatEventCode(value: string): value is WeChatEventCode {
  return Object.values(WECHAT_EVENTS).includes(value as WeChatEventCode);
}

export function getWeChatEventMeta(eventCode: WeChatEventCode) {
  return WECHAT_EVENT_META[eventCode];
}
