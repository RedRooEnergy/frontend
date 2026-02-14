import { getWeChatEventMeta, WECHAT_EVENTS, type WeChatEventCode } from "./events";
import { upsertWeChatTemplateRegistry, type WeChatStoreDependencies } from "./store";

const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const TEMPLATE_COPY: Record<WeChatEventCode, Record<"en-AU" | "zh-CN", string>> = {
  [WECHAT_EVENTS.ORDER_CREATED_NOTIFY_V1]: {
    "en-AU":
      "RRE order {{orderId}} has been created for your queue. Review and action in RRE: {{actionUrl}}.",
    "zh-CN": "RRE 订单 {{orderId}} 已进入您的处理队列。请在 RRE 中查看并处理：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.ORDER_DOCS_REQUIRED_PROMPT_V1]: {
    "en-AU":
      "Order {{orderId}} requires documents. Required documents: {{requiredDocuments}}. Submit in RRE: {{actionUrl}}.",
    "zh-CN":
      "订单 {{orderId}} 需要补充资料。所需文件：{{requiredDocuments}}。请在 RRE 中提交：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.ORDER_DISPATCH_REQUIRED_PROMPT_V1]: {
    "en-AU": "Order {{orderId}} is ready for dispatch. Complete dispatch steps in RRE: {{actionUrl}}.",
    "zh-CN": "订单 {{orderId}} 已可发运。请在 RRE 中完成发运步骤：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.ORDER_DELIVERY_CONFIRMED_NOTIFY_V1]: {
    "en-AU":
      "Delivery is confirmed for order {{orderId}}. Review post-delivery actions in RRE: {{actionUrl}}.",
    "zh-CN": "订单 {{orderId}} 已确认送达。请在 RRE 中查看后续操作：{{actionUrl}}。",
  },

  [WECHAT_EVENTS.COMPLIANCE_CERT_REQUIRED_PROMPT_V1]: {
    "en-AU":
      "Compliance case {{complianceCaseId}} requires certifications. Required certifications: {{requiredCerts}}. Submit in RRE: {{actionUrl}}.",
    "zh-CN":
      "合规案例 {{complianceCaseId}} 需要认证文件。所需认证：{{requiredCerts}}。请在 RRE 中提交：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.COMPLIANCE_SUBMISSION_READY_PROMPT_V1]: {
    "en-AU":
      "Compliance case {{complianceCaseId}} is ready for submission. Continue in RRE: {{actionUrl}}.",
    "zh-CN": "合规案例 {{complianceCaseId}} 已可提交。请在 RRE 中继续：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.COMPLIANCE_SUBMITTED_STATUS_V1]: {
    "en-AU": "Compliance case {{complianceCaseId}} has been submitted. Track status in RRE: {{actionUrl}}.",
    "zh-CN": "合规案例 {{complianceCaseId}} 已提交。请在 RRE 中跟踪状态：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.COMPLIANCE_REWORK_REQUIRED_PROMPT_V1]: {
    "en-AU":
      "Compliance case {{complianceCaseId}} requires rework. Missing fields: {{missingFields}}. Update in RRE: {{actionUrl}}.",
    "zh-CN":
      "合规案例 {{complianceCaseId}} 需要返工。缺失字段：{{missingFields}}。请在 RRE 中更新：{{actionUrl}}。",
  },

  [WECHAT_EVENTS.FREIGHT_BOOKING_REQUIRED_PROMPT_V1]: {
    "en-AU":
      "Shipment {{shipmentId}} for order {{orderId}} is ready for freight booking. Complete booking in RRE: {{actionUrl}}.",
    "zh-CN":
      "订单 {{orderId}} 的货运批次 {{shipmentId}} 已可订舱。请在 RRE 中完成订舱：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.FREIGHT_DOCUMENTS_REQUIRED_PROMPT_V1]: {
    "en-AU":
      "Shipment {{shipmentId}} is missing freight documents: {{missingDocuments}}. Upload in RRE: {{actionUrl}}.",
    "zh-CN":
      "货运批次 {{shipmentId}} 缺少文件：{{missingDocuments}}。请在 RRE 中上传：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.FREIGHT_CUSTOMS_HOLD_ALERT_V1]: {
    "en-AU":
      "Customs hold alert for shipment {{shipmentId}}. Review required actions in RRE: {{actionUrl}}.",
    "zh-CN": "货运批次 {{shipmentId}} 出现海关暂扣。请在 RRE 中查看处理步骤：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.FREIGHT_DELIVERED_NOTIFY_V1]: {
    "en-AU":
      "Shipment {{shipmentId}} for order {{orderId}} is marked delivered. Review records in RRE: {{actionUrl}}.",
    "zh-CN": "订单 {{orderId}} 的货运批次 {{shipmentId}} 已标记送达。请在 RRE 中查看记录：{{actionUrl}}。",
  },

  [WECHAT_EVENTS.PAYMENT_ACTION_REQUIRED_PROMPT_V1]: {
    "en-AU":
      "Payment {{paymentId}} for order {{orderId}} requires action. Complete securely in RRE: {{actionUrl}}.",
    "zh-CN":
      "订单 {{orderId}} 的付款 {{paymentId}} 需要处理。请在 RRE 中安全完成：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.PAYMENT_RECEIVED_CONFIRM_V1]: {
    "en-AU":
      "Payment {{paymentId}} for order {{orderId}} is confirmed received. Review details in RRE: {{actionUrl}}.",
    "zh-CN":
      "订单 {{orderId}} 的付款 {{paymentId}} 已确认到账。请在 RRE 中查看详情：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.PAYMENT_REFUND_INITIATED_NOTIFY_V1]: {
    "en-AU":
      "Refund is initiated for payment {{paymentId}} on order {{orderId}}. View status in RRE: {{actionUrl}}.",
    "zh-CN":
      "订单 {{orderId}} 的付款 {{paymentId}} 已发起退款。请在 RRE 中查看状态：{{actionUrl}}。",
  },

  [WECHAT_EVENTS.ACCOUNT_BINDING_VERIFIED_CONFIRM_V1]: {
    "en-AU":
      "WeChat binding {{bindingId}} is verified for your supplier account. Review channel settings in RRE: {{actionUrl}}.",
    "zh-CN":
      "您的供应商账户微信绑定 {{bindingId}} 已验证。请在 RRE 中查看渠道设置：{{actionUrl}}。",
  },
  [WECHAT_EVENTS.ACCOUNT_BINDING_REVOKED_NOTIFY_V1]: {
    "en-AU":
      "WeChat binding {{bindingId}} has been revoked for your supplier account. Review and reconnect in RRE: {{actionUrl}}.",
    "zh-CN":
      "您的供应商账户微信绑定 {{bindingId}} 已撤销。请在 RRE 中查看并重新连接：{{actionUrl}}。",
  },
};

function findPlaceholders(template: string) {
  const found = new Set<string>();
  PLACEHOLDER_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null = null;
  while ((match = PLACEHOLDER_REGEX.exec(template)) !== null) {
    if (match[1]) found.add(match[1]);
  }
  return Array.from(found).sort((a, b) => a.localeCompare(b));
}

function buildTemplateText(input: {
  eventCode: WeChatEventCode;
  language: "en-AU" | "zh-CN";
  requiredPlaceholders: string[];
}) {
  const template = TEMPLATE_COPY[input.eventCode][input.language];
  const placeholders = findPlaceholders(template);
  const required = [...input.requiredPlaceholders].sort((a, b) => a.localeCompare(b));
  if (placeholders.length !== required.length) {
    throw new Error(`WECHAT_TEMPLATE_COPY_CONTRACT_VIOLATION: placeholder count mismatch for ${input.eventCode}`);
  }
  for (let index = 0; index < required.length; index += 1) {
    if (placeholders[index] !== required[index]) {
      throw new Error(`WECHAT_TEMPLATE_COPY_CONTRACT_VIOLATION: placeholder mismatch for ${input.eventCode}`);
    }
  }
  return template;
}

const EVENT_CODES = Object.values(WECHAT_EVENTS) as WeChatEventCode[];

export async function seedWeChatTemplates(input: {
  status?: "DRAFT" | "LOCKED";
  schemaVersion?: string;
} = {}, dependencyOverrides: Partial<WeChatStoreDependencies> = {}) {
  const status = input.status || "LOCKED";
  const schemaVersion = input.schemaVersion || "v1";

  let createdOrUpdated = 0;

  for (const eventCode of EVENT_CODES) {
    const meta = getWeChatEventMeta(eventCode);

    for (const language of ["en-AU", "zh-CN"] as const) {
      await upsertWeChatTemplateRegistry({
        eventCode,
        templateKey: `${eventCode.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        wechatTemplateId: `${eventCode.replace(/\./g, "_")}_${language}`,
        language,
        schemaVersion,
        requiredPlaceholders: meta.requiredPlaceholders,
        allowedLinks: ["/dashboard/*", "/supplier/*", "/compliance/*", "/freight/*", "/payments/*"],
        status,
        renderTemplate: buildTemplateText({
          eventCode,
          language,
          requiredPlaceholders: meta.requiredPlaceholders,
        }),
      }, dependencyOverrides);
      createdOrUpdated += 1;
    }
  }

  return {
    createdOrUpdated,
    eventCodes: EVENT_CODES.length,
    languages: 2,
  };
}
