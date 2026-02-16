export const EMAIL_EVENTS = {
  BUYER_ACCOUNT_CREATED: "BUYER_ACCOUNT_CREATED",
  BUYER_EMAIL_VERIFIED: "BUYER_EMAIL_VERIFIED",
  BUYER_ACCOUNT_SUSPENDED: "BUYER_ACCOUNT_SUSPENDED",
  BUYER_ACCOUNT_REINSTATED: "BUYER_ACCOUNT_REINSTATED",

  SUPPLIER_ACCOUNT_CREATED: "SUPPLIER_ACCOUNT_CREATED",
  SUPPLIER_PROFILE_APPROVED: "SUPPLIER_PROFILE_APPROVED",
  SUPPLIER_PROFILE_REJECTED: "SUPPLIER_PROFILE_REJECTED",
  SUPPLIER_ACCOUNT_SUSPENDED: "SUPPLIER_ACCOUNT_SUSPENDED",
  SUPPLIER_ACCOUNT_REINSTATED: "SUPPLIER_ACCOUNT_REINSTATED",

  PARTNER_ACCOUNT_CREATED: "PARTNER_ACCOUNT_CREATED",
  PARTNER_PROFILE_APPROVED: "PARTNER_PROFILE_APPROVED",
  PARTNER_PROFILE_REJECTED: "PARTNER_PROFILE_REJECTED",
  PARTNER_ACCOUNT_SUSPENDED: "PARTNER_ACCOUNT_SUSPENDED",

  PRODUCT_SUBMITTED_FOR_REVIEW: "PRODUCT_SUBMITTED_FOR_REVIEW",
  PRODUCT_APPROVED: "PRODUCT_APPROVED",
  PRODUCT_REJECTED: "PRODUCT_REJECTED",
  PRODUCT_SUSPENDED: "PRODUCT_SUSPENDED",

  ORDER_CREATED: "ORDER_CREATED",
  ORDER_CONFIRMED_BY_SUPPLIER: "ORDER_CONFIRMED_BY_SUPPLIER",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  ORDER_COMPLETED: "ORDER_COMPLETED",

  PAYMENT_AUTHORISED: "PAYMENT_AUTHORISED",
  PAYMENT_CAPTURED: "PAYMENT_CAPTURED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  SERVICE_FEE_RECORDED: "SERVICE_FEE_RECORDED",

  COMPLIANCE_DOCUMENT_REQUESTED: "COMPLIANCE_DOCUMENT_REQUESTED",
  COMPLIANCE_DOCUMENT_APPROVED: "COMPLIANCE_DOCUMENT_APPROVED",
  COMPLIANCE_DOCUMENT_REJECTED: "COMPLIANCE_DOCUMENT_REJECTED",
  COMPLIANCE_EXPIRY_WARNING: "COMPLIANCE_EXPIRY_WARNING",

  FREIGHT_BOOKED: "FREIGHT_BOOKED",
  FREIGHT_IN_TRANSIT: "FREIGHT_IN_TRANSIT",
  DELIVERY_CONFIRMED: "DELIVERY_CONFIRMED",

  RETURN_REQUEST_SUBMITTED: "RETURN_REQUEST_SUBMITTED",
  RETURN_APPROVED: "RETURN_APPROVED",
  REFUND_ISSUED: "REFUND_ISSUED",
  DISPUTE_OPENED: "DISPUTE_OPENED",

  ADMIN_ACTION_CONFIRMED: "ADMIN_ACTION_CONFIRMED",
  SYSTEM_POLICY_UPDATED: "SYSTEM_POLICY_UPDATED",

  REGULATOR_EXPORT_GENERATED: "REGULATOR_EXPORT_GENERATED",
  AUDIT_PACK_GENERATED: "AUDIT_PACK_GENERATED",
} as const;

export type EmailEventCode = (typeof EMAIL_EVENTS)[keyof typeof EMAIL_EVENTS];

export type EmailSeverity = "INFO" | "ACTION" | "LEGAL" | "REGULATORY";
export type EmailRecipientRole = "buyer" | "supplier" | "service-partner" | "admin" | "regulator";

export const EMAIL_EVENT_META: Record<
  EmailEventCode,
  { severity: EmailSeverity; roles: EmailRecipientRole[]; auditRequired: boolean }
> = {
  BUYER_ACCOUNT_CREATED: { severity: "INFO", roles: ["buyer"], auditRequired: true },
  BUYER_EMAIL_VERIFIED: { severity: "INFO", roles: ["buyer"], auditRequired: true },
  BUYER_ACCOUNT_SUSPENDED: { severity: "LEGAL", roles: ["buyer"], auditRequired: true },
  BUYER_ACCOUNT_REINSTATED: { severity: "INFO", roles: ["buyer"], auditRequired: true },

  SUPPLIER_ACCOUNT_CREATED: { severity: "INFO", roles: ["supplier"], auditRequired: true },
  SUPPLIER_PROFILE_APPROVED: { severity: "LEGAL", roles: ["supplier"], auditRequired: true },
  SUPPLIER_PROFILE_REJECTED: { severity: "ACTION", roles: ["supplier"], auditRequired: true },
  SUPPLIER_ACCOUNT_SUSPENDED: { severity: "LEGAL", roles: ["supplier"], auditRequired: true },
  SUPPLIER_ACCOUNT_REINSTATED: { severity: "INFO", roles: ["supplier"], auditRequired: true },

  PARTNER_ACCOUNT_CREATED: { severity: "INFO", roles: ["service-partner"], auditRequired: true },
  PARTNER_PROFILE_APPROVED: { severity: "LEGAL", roles: ["service-partner"], auditRequired: true },
  PARTNER_PROFILE_REJECTED: { severity: "ACTION", roles: ["service-partner"], auditRequired: true },
  PARTNER_ACCOUNT_SUSPENDED: { severity: "LEGAL", roles: ["service-partner"], auditRequired: true },

  PRODUCT_SUBMITTED_FOR_REVIEW: { severity: "INFO", roles: ["supplier"], auditRequired: true },
  PRODUCT_APPROVED: { severity: "LEGAL", roles: ["supplier"], auditRequired: true },
  PRODUCT_REJECTED: { severity: "ACTION", roles: ["supplier"], auditRequired: true },
  PRODUCT_SUSPENDED: { severity: "LEGAL", roles: ["supplier"], auditRequired: true },

  ORDER_CREATED: { severity: "INFO", roles: ["buyer", "supplier"], auditRequired: true },
  ORDER_CONFIRMED_BY_SUPPLIER: { severity: "INFO", roles: ["buyer"], auditRequired: true },
  ORDER_CANCELLED: { severity: "LEGAL", roles: ["buyer", "supplier"], auditRequired: true },
  ORDER_COMPLETED: { severity: "LEGAL", roles: ["buyer", "supplier"], auditRequired: true },

  PAYMENT_AUTHORISED: { severity: "INFO", roles: ["buyer"], auditRequired: true },
  PAYMENT_CAPTURED: { severity: "LEGAL", roles: ["buyer", "supplier"], auditRequired: true },
  PAYMENT_FAILED: { severity: "ACTION", roles: ["buyer"], auditRequired: true },
  SERVICE_FEE_RECORDED: { severity: "INFO", roles: ["buyer", "supplier"], auditRequired: true },

  COMPLIANCE_DOCUMENT_REQUESTED: { severity: "ACTION", roles: ["supplier"], auditRequired: true },
  COMPLIANCE_DOCUMENT_APPROVED: { severity: "LEGAL", roles: ["supplier"], auditRequired: true },
  COMPLIANCE_DOCUMENT_REJECTED: { severity: "ACTION", roles: ["supplier"], auditRequired: true },
  COMPLIANCE_EXPIRY_WARNING: { severity: "ACTION", roles: ["supplier"], auditRequired: true },

  FREIGHT_BOOKED: { severity: "INFO", roles: ["buyer", "supplier"], auditRequired: true },
  FREIGHT_IN_TRANSIT: { severity: "INFO", roles: ["buyer"], auditRequired: true },
  DELIVERY_CONFIRMED: { severity: "LEGAL", roles: ["buyer", "supplier"], auditRequired: true },

  RETURN_REQUEST_SUBMITTED: { severity: "ACTION", roles: ["supplier"], auditRequired: true },
  RETURN_APPROVED: { severity: "LEGAL", roles: ["buyer"], auditRequired: true },
  REFUND_ISSUED: { severity: "LEGAL", roles: ["buyer"], auditRequired: true },
  DISPUTE_OPENED: { severity: "LEGAL", roles: ["buyer", "supplier", "admin"], auditRequired: true },

  ADMIN_ACTION_CONFIRMED: { severity: "LEGAL", roles: ["admin"], auditRequired: true },
  SYSTEM_POLICY_UPDATED: { severity: "LEGAL", roles: ["admin"], auditRequired: true },

  REGULATOR_EXPORT_GENERATED: { severity: "LEGAL", roles: ["admin"], auditRequired: true },
  AUDIT_PACK_GENERATED: { severity: "LEGAL", roles: ["admin"], auditRequired: true },
};

export function isValidEventCode(value: string): value is EmailEventCode {
  return Object.prototype.hasOwnProperty.call(EMAIL_EVENT_META, value);
}
