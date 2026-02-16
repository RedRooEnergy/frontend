type AuditEvent =
  | "BUYER_VIEW_ORDER"
  | "BUYER_CHECKOUT_START"
  | "BUYER_ORDER_PLACED"
  | "BUYER_PAYMENT_STARTED"
  | "BUYER_PAYMENT_SUCCEEDED"
  | "BUYER_VIEW_TRACKING"
  | "BUYER_ORDER_CANCELLED"
  | "BUYER_RETURN_REQUESTED"
  | "BUYER_VIEW_RETURN"
  | "BUYER_WARRANTY_SUBMITTED"
  | "BUYER_VIEW_WARRANTY"
  | "BUYER_DOCUMENT_DOWNLOADED"
  | "BUYER_TICKET_CREATED"
  | "BUYER_VIEW_TICKET"
  | "BUYER_NOTIFICATION_VIEWED"
  | "NOTIFICATION_VIEWED"
  | "BUYER_PROFILE_UPDATED"
  | "BUYER_ACCESS_DENIED"
  | "PAYMENT_WEBHOOK_PROCESSED"
  | "PAYMENT_WEBHOOK_DUPLICATE_IGNORED"
  | "PAYMENT_REVIEW_TRIGGERED"
  | "ADMIN_VIEW_PAYMENTS"
  | "BUYER_REFUND_REQUESTED"
  | "BUYER_REFUND_VIEWED"
  | "STRIPE_REFUND_INITIATED"
  | "STRIPE_REFUND_SUCCEEDED"
  | "ADMIN_VIEW_SETTLEMENTS"
  | "ADMIN_SETTLEMENT_INITIATED"
  | "ADMIN_SETTLEMENT_COMPLETED"
  | "SUPPLIER_ONBOARDING_COMPLETED"
  | "SUPPLIER_ONBOARDING_ACKNOWLEDGED"
  | "SUPPLIER_CAPABILITY_DECLARED"
  | "SUPPLIER_PRODUCT_STATE_CHANGED"
  | "SUPPLIER_PRODUCT_DRAFT_CREATED"
  | "SUPPLIER_PRODUCT_DRAFT_DELETED"
  | "SUPPLIER_PARTNER_REVIEW_REQUESTED"
  | "SUPPLIER_PRODUCT_SUBMITTED"
  | "SUPPLIER_SHIPMENT_UPDATE_RECORDED"
  | "SUPPLIER_PAYOUT_READINESS_CHECKED"
  | "SUPPLIER_COMPANY_PROFILE_SAVED"
  | "SUPPLIER_COMPANY_PROFILE_SUBMITTED"
  | "SUPPLIER_COMPLIANCE_PROFILE_SAVED"
  | "SUPPLIER_COMPLIANCE_CERT_ADDED"
  | "PARTNER_REVIEW_PASS"
  | "PARTNER_REVIEW_FAIL"
  | "INSTALLER_ATTRIBUTION_CHANGE_BLOCKED"
  | "ADMIN_VIEW_OVERSIGHT"
  | "ADMIN_DISPUTE_UPDATED"
  | "ADMIN_COMPLIANCE_DECIDED"
  | "ADMIN_EXPORT_GENERATED"
  | "ADMIN_OVERRIDE_APPLIED"
  | "EXT02_ACTION_INITIATED"
  | "EXT02_ACTION_COMPLETED"
  | "EXT03_ACTION_INITIATED"
  | "EXT03_ACTION_COMPLETED"
  | "EXT04_ACTION_INITIATED"
  | "EXT04_ACTION_COMPLETED"
  | "EXT05_ACTION_INITIATED"
  | "EXT05_ACTION_COMPLETED";

export interface AuditRecord {
  id: string;
  event: AuditEvent;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

const KEY = "rre-v1:audit";

export function readAudit(): AuditRecord[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AuditRecord[];
  } catch {
    return [];
  }
}

export function writeAudit(records: AuditRecord[]) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(KEY, JSON.stringify(records));
}

export function recordAudit(event: AuditEvent, metadata?: Record<string, unknown>) {
  const records = readAudit();
  records.push({
    id: crypto.randomUUID(),
    event,
    createdAt: new Date().toISOString(),
    metadata,
  });
  writeAudit(records);
}
