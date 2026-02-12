import type { DashboardDomain, Permission, RoleName, Subject } from "./types";

type RolePermissionMatrix = Record<RoleName, Permission[]>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionMatrix = {
  BUYER: [
    { subject: "BUYER_ORDERS", actions: ["CREATE", "READ"] },
    { subject: "BUYER_DOCUMENTS", actions: ["READ"] },
    { subject: "COMPLIANCE_DOCUMENTS", actions: ["READ"] },
  ],
  SUPPLIER: [
    { subject: "SUPPLIER_PRODUCTS", actions: ["CREATE", "READ", "UPDATE"] },
    { subject: "SUPPLIER_COMPLIANCE", actions: ["CREATE", "READ", "UPDATE"] },
    { subject: "SUPPLIER_ORDERS", actions: ["READ", "UPDATE"] },
  ],
  FREIGHT: [
    { subject: "FREIGHT_SHIPMENTS", actions: ["READ", "UPDATE", "CONFIRM"] },
    { subject: "SUPPLIER_ORDERS", actions: ["READ"] },
  ],
  INSTALLER: [
    { subject: "INSTALLER_CONFIRMATIONS", actions: ["READ", "CONFIRM"] },
    { subject: "SUPPLIER_ORDERS", actions: ["READ"] },
  ],
  RRE_ADMIN: [
    { subject: "BUYER_ORDERS", actions: ["READ", "UPDATE", "APPROVE"] },
    { subject: "BUYER_DOCUMENTS", actions: ["READ", "UPDATE"] },
    { subject: "SUPPLIER_PRODUCTS", actions: ["READ", "UPDATE", "APPROVE"] },
    { subject: "SUPPLIER_COMPLIANCE", actions: ["READ", "UPDATE", "APPROVE"] },
    { subject: "SUPPLIER_ORDERS", actions: ["READ", "UPDATE"] },
    { subject: "FREIGHT_SHIPMENTS", actions: ["READ", "UPDATE", "APPROVE"] },
    { subject: "INSTALLER_CONFIRMATIONS", actions: ["READ", "UPDATE", "APPROVE"] },
    { subject: "ADMIN_OPERATIONS", actions: ["CREATE", "READ", "UPDATE", "APPROVE"] },
    { subject: "AUDIT_LOGS", actions: ["READ"] },
    { subject: "FINANCE_SETTLEMENTS", actions: ["READ"] },
    { subject: "FINANCE_PRICING_RULES", actions: ["READ"] },
    { subject: "MARKETING_PROMOTIONS", actions: ["READ"] },
    { subject: "MARKETING_EMAILS", actions: ["READ"] },
  ],
  RRE_FINANCE: [
    { subject: "FINANCE_SETTLEMENTS", actions: ["CREATE", "READ", "UPDATE", "RELEASE", "APPROVE"] },
    { subject: "FINANCE_PRICING_RULES", actions: ["CREATE", "READ", "UPDATE", "APPROVE"] },
    { subject: "BUYER_ORDERS", actions: ["READ"] },
    { subject: "SUPPLIER_ORDERS", actions: ["READ"] },
    { subject: "FREIGHT_SHIPMENTS", actions: ["READ"] },
    { subject: "SUPPLIER_COMPLIANCE", actions: ["READ"] },
    { subject: "INSTALLER_CONFIRMATIONS", actions: ["READ"] },
    { subject: "AUDIT_LOGS", actions: ["READ"] },
  ],
  RRE_CEO: [
    { subject: "BUYER_ORDERS", actions: ["READ"] },
    { subject: "BUYER_DOCUMENTS", actions: ["READ"] },
    { subject: "SUPPLIER_PRODUCTS", actions: ["READ"] },
    { subject: "SUPPLIER_COMPLIANCE", actions: ["READ"] },
    { subject: "SUPPLIER_ORDERS", actions: ["READ"] },
    { subject: "FREIGHT_SHIPMENTS", actions: ["READ"] },
    { subject: "INSTALLER_CONFIRMATIONS", actions: ["READ"] },
    { subject: "ADMIN_OPERATIONS", actions: ["READ"] },
    { subject: "FINANCE_SETTLEMENTS", actions: ["READ"] },
    { subject: "FINANCE_PRICING_RULES", actions: ["READ"] },
    { subject: "MARKETING_PROMOTIONS", actions: ["READ"] },
    { subject: "MARKETING_EMAILS", actions: ["READ"] },
    { subject: "COMPLIANCE_DOCUMENTS", actions: ["READ"] },
    { subject: "AUDIT_LOGS", actions: ["READ"] },
  ],
  RRE_MARKETING: [
    { subject: "MARKETING_PROMOTIONS", actions: ["CREATE", "READ", "UPDATE", "APPROVE"] },
    { subject: "MARKETING_EMAILS", actions: ["CREATE", "READ", "UPDATE", "APPROVE"] },
    { subject: "BUYER_ORDERS", actions: ["READ"] },
    { subject: "SUPPLIER_ORDERS", actions: ["READ"] },
    { subject: "SUPPLIER_PRODUCTS", actions: ["READ"] },
    { subject: "FREIGHT_SHIPMENTS", actions: ["READ"] },
    { subject: "INSTALLER_CONFIRMATIONS", actions: ["READ"] },
    { subject: "FINANCE_SETTLEMENTS", actions: ["READ"] },
    { subject: "AUDIT_LOGS", actions: ["READ"] },
  ],
};

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  BUYER: "Buyer account role",
  SUPPLIER: "Supplier domain role",
  FREIGHT: "Freight operations role",
  INSTALLER: "Installer operations role",
  RRE_ADMIN: "Platform administration role",
  RRE_FINANCE: "Finance operations role",
  RRE_CEO: "Executive oversight role",
  RRE_MARKETING: "Marketing and promotions role",
};

export const DOMAIN_SUBJECTS: Record<DashboardDomain, Subject[]> = {
  buyer: ["BUYER_ORDERS", "BUYER_DOCUMENTS", "COMPLIANCE_DOCUMENTS"],
  supplier: ["SUPPLIER_PRODUCTS", "SUPPLIER_COMPLIANCE", "SUPPLIER_ORDERS"],
  freight: ["FREIGHT_SHIPMENTS", "SUPPLIER_ORDERS"],
  installer: ["INSTALLER_CONFIRMATIONS", "SUPPLIER_ORDERS"],
  admin: ["ADMIN_OPERATIONS", "AUDIT_LOGS", "BUYER_ORDERS", "SUPPLIER_ORDERS"],
  finance: ["FINANCE_SETTLEMENTS", "FINANCE_PRICING_RULES", "AUDIT_LOGS"],
  ceo: [
    "BUYER_ORDERS",
    "SUPPLIER_ORDERS",
    "FREIGHT_SHIPMENTS",
    "INSTALLER_CONFIRMATIONS",
    "FINANCE_SETTLEMENTS",
    "MARKETING_PROMOTIONS",
    "AUDIT_LOGS",
  ],
  marketing: ["MARKETING_PROMOTIONS", "MARKETING_EMAILS", "BUYER_ORDERS"],
};

