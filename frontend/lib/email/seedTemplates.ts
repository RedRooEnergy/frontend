import { EmailEventCode, EmailRecipientRole } from "./events";
import type { EmailTemplate } from "./store";

const BASE_ALLOWED_VARIABLES = [
  "recipientName",
  "eventCode",
  "referenceId",
  "referenceUrl",
  "actionRequired",
] as const;

type TemplateSeed = {
  templateId: string;
  eventCode: EmailEventCode;
  roleScope: EmailRecipientRole;
};

const TEMPLATE_REGISTRY: TemplateSeed[] = [
  { templateId: "buyer_account_created_v1", eventCode: "BUYER_ACCOUNT_CREATED", roleScope: "buyer" },
  { templateId: "buyer_email_verified_v1", eventCode: "BUYER_EMAIL_VERIFIED", roleScope: "buyer" },
  { templateId: "buyer_account_suspended_v1", eventCode: "BUYER_ACCOUNT_SUSPENDED", roleScope: "buyer" },
  { templateId: "buyer_account_reinstated_v1", eventCode: "BUYER_ACCOUNT_REINSTATED", roleScope: "buyer" },

  { templateId: "supplier_account_created_v1", eventCode: "SUPPLIER_ACCOUNT_CREATED", roleScope: "supplier" },
  { templateId: "supplier_profile_approved_v1", eventCode: "SUPPLIER_PROFILE_APPROVED", roleScope: "supplier" },
  { templateId: "supplier_profile_rejected_v1", eventCode: "SUPPLIER_PROFILE_REJECTED", roleScope: "supplier" },
  { templateId: "supplier_account_suspended_v1", eventCode: "SUPPLIER_ACCOUNT_SUSPENDED", roleScope: "supplier" },
  { templateId: "supplier_account_reinstated_v1", eventCode: "SUPPLIER_ACCOUNT_REINSTATED", roleScope: "supplier" },

  { templateId: "partner_account_created_v1", eventCode: "PARTNER_ACCOUNT_CREATED", roleScope: "service-partner" },
  { templateId: "partner_profile_approved_v1", eventCode: "PARTNER_PROFILE_APPROVED", roleScope: "service-partner" },
  { templateId: "partner_profile_rejected_v1", eventCode: "PARTNER_PROFILE_REJECTED", roleScope: "service-partner" },
  { templateId: "partner_account_suspended_v1", eventCode: "PARTNER_ACCOUNT_SUSPENDED", roleScope: "service-partner" },

  { templateId: "product_submitted_v1", eventCode: "PRODUCT_SUBMITTED_FOR_REVIEW", roleScope: "supplier" },
  { templateId: "product_approved_v1", eventCode: "PRODUCT_APPROVED", roleScope: "supplier" },
  { templateId: "product_rejected_v1", eventCode: "PRODUCT_REJECTED", roleScope: "supplier" },
  { templateId: "product_suspended_v1", eventCode: "PRODUCT_SUSPENDED", roleScope: "supplier" },

  { templateId: "order_created_buyer_v1", eventCode: "ORDER_CREATED", roleScope: "buyer" },
  { templateId: "order_created_supplier_v1", eventCode: "ORDER_CREATED", roleScope: "supplier" },
  { templateId: "order_confirmed_buyer_v1", eventCode: "ORDER_CONFIRMED_BY_SUPPLIER", roleScope: "buyer" },
  { templateId: "order_cancelled_buyer_v1", eventCode: "ORDER_CANCELLED", roleScope: "buyer" },
  { templateId: "order_cancelled_supplier_v1", eventCode: "ORDER_CANCELLED", roleScope: "supplier" },
  { templateId: "order_completed_buyer_v1", eventCode: "ORDER_COMPLETED", roleScope: "buyer" },
  { templateId: "order_completed_supplier_v1", eventCode: "ORDER_COMPLETED", roleScope: "supplier" },

  { templateId: "payment_authorised_v1", eventCode: "PAYMENT_AUTHORISED", roleScope: "buyer" },
  { templateId: "payment_captured_buyer_v1", eventCode: "PAYMENT_CAPTURED", roleScope: "buyer" },
  { templateId: "payment_captured_supplier_v1", eventCode: "PAYMENT_CAPTURED", roleScope: "supplier" },
  { templateId: "payment_failed_v1", eventCode: "PAYMENT_FAILED", roleScope: "buyer" },
  { templateId: "service_fee_recorded_buyer_v1", eventCode: "SERVICE_FEE_RECORDED", roleScope: "buyer" },
  { templateId: "service_fee_recorded_supplier_v1", eventCode: "SERVICE_FEE_RECORDED", roleScope: "supplier" },

  { templateId: "compliance_requested_v1", eventCode: "COMPLIANCE_DOCUMENT_REQUESTED", roleScope: "supplier" },
  { templateId: "compliance_approved_v1", eventCode: "COMPLIANCE_DOCUMENT_APPROVED", roleScope: "supplier" },
  { templateId: "compliance_rejected_v1", eventCode: "COMPLIANCE_DOCUMENT_REJECTED", roleScope: "supplier" },
  { templateId: "compliance_expiry_warning_v1", eventCode: "COMPLIANCE_EXPIRY_WARNING", roleScope: "supplier" },

  { templateId: "freight_booked_buyer_v1", eventCode: "FREIGHT_BOOKED", roleScope: "buyer" },
  { templateId: "freight_booked_supplier_v1", eventCode: "FREIGHT_BOOKED", roleScope: "supplier" },
  { templateId: "freight_in_transit_v1", eventCode: "FREIGHT_IN_TRANSIT", roleScope: "buyer" },
  { templateId: "delivery_confirmed_buyer_v1", eventCode: "DELIVERY_CONFIRMED", roleScope: "buyer" },
  { templateId: "delivery_confirmed_supplier_v1", eventCode: "DELIVERY_CONFIRMED", roleScope: "supplier" },

  { templateId: "return_requested_v1", eventCode: "RETURN_REQUEST_SUBMITTED", roleScope: "supplier" },
  { templateId: "return_approved_v1", eventCode: "RETURN_APPROVED", roleScope: "buyer" },
  { templateId: "refund_issued_v1", eventCode: "REFUND_ISSUED", roleScope: "buyer" },
  { templateId: "dispute_opened_buyer_v1", eventCode: "DISPUTE_OPENED", roleScope: "buyer" },
  { templateId: "dispute_opened_supplier_v1", eventCode: "DISPUTE_OPENED", roleScope: "supplier" },
  { templateId: "dispute_opened_admin_v1", eventCode: "DISPUTE_OPENED", roleScope: "admin" },

  { templateId: "admin_action_confirmed_v1", eventCode: "ADMIN_ACTION_CONFIRMED", roleScope: "admin" },
  { templateId: "system_policy_updated_v1", eventCode: "SYSTEM_POLICY_UPDATED", roleScope: "admin" },

  { templateId: "regulator_export_generated_v1", eventCode: "REGULATOR_EXPORT_GENERATED", roleScope: "admin" },
  { templateId: "audit_pack_generated_v1", eventCode: "AUDIT_PACK_GENERATED", roleScope: "admin" },
];

function formatEventLabel(eventCode: string) {
  return eventCode.replace(/_/g, " ").toLowerCase();
}

function buildTemplate(seed: TemplateSeed): EmailTemplate {
  const label = formatEventLabel(seed.eventCode);
  const subject = `RRE update: ${label}`;
  const bodyHtml = `
    <p>Hello {{recipientName}},</p>
    <p>This is a confirmation for <strong>${label}</strong>.</p>
    <p>Reference: {{referenceId}}</p>
    <p>Action required: {{actionRequired}}</p>
    <p><a href="{{referenceUrl}}">View details</a></p>
  `.trim();
  const bodyText = `Hello {{recipientName}},\nThis is a confirmation for ${label}.\nReference: {{referenceId}}\nAction required: {{actionRequired}}\nView details: {{referenceUrl}}`;

  return {
    templateId: seed.templateId,
    eventCode: seed.eventCode,
    roleScope: seed.roleScope,
    language: "EN",
    subjectTemplate: subject,
    bodyTemplateHtml: bodyHtml,
    bodyTemplateText: bodyText,
    allowedVariables: [...BASE_ALLOWED_VARIABLES],
    version: 1,
    status: "LOCKED",
  };
}

export function getSeedEmailTemplates(): EmailTemplate[] {
  return TEMPLATE_REGISTRY.map(buildTemplate);
}
