export const RoleNames = [
  "BUYER",
  "SUPPLIER",
  "FREIGHT",
  "INSTALLER",
  "RRE_ADMIN",
  "RRE_FINANCE",
  "RRE_CEO",
  "RRE_MARKETING",
] as const;

export type RoleName = (typeof RoleNames)[number];

export const Actions = ["CREATE", "READ", "UPDATE", "DELETE", "APPROVE", "RELEASE", "CONFIRM"] as const;
export type Action = (typeof Actions)[number];

export const Subjects = [
  "BUYER_ORDERS",
  "BUYER_DOCUMENTS",
  "SUPPLIER_PRODUCTS",
  "SUPPLIER_COMPLIANCE",
  "SUPPLIER_ORDERS",
  "FREIGHT_SHIPMENTS",
  "INSTALLER_CONFIRMATIONS",
  "ADMIN_OPERATIONS",
  "FINANCE_SETTLEMENTS",
  "FINANCE_PRICING_RULES",
  "MARKETING_PROMOTIONS",
  "MARKETING_EMAILS",
  "COMPLIANCE_DOCUMENTS",
  "AUDIT_LOGS",
] as const;

export type Subject = (typeof Subjects)[number];

export type Permission = {
  subject: Subject;
  actions: Action[];
};

export type Actor = {
  userId: string;
  role: RoleName;
  email: string;
};

export type ResourceContext = {
  resourceId?: string;
  ownerId?: string;
  metadata?: Record<string, unknown>;
};

export type AuthorizationDecision = {
  allowed: boolean;
  reason: string;
};

export type DashboardDomain =
  | "buyer"
  | "supplier"
  | "freight"
  | "installer"
  | "admin"
  | "finance"
  | "ceo"
  | "marketing";
