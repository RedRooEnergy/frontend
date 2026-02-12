import type { Action, DashboardDomain, Subject } from "./types";

export const DASHBOARD_LABELS: Record<DashboardDomain, string> = {
  buyer: "Buyer",
  supplier: "Supplier",
  freight: "Freight",
  installer: "Installer",
  admin: "RRE Admin",
  finance: "RRE Finance",
  ceo: "RRE CEO",
  marketing: "RRE Marketing & Promotion",
};

export type DashboardActionDefinition = {
  id: string;
  label: string;
  domain: DashboardDomain;
  subject: Subject;
  action: Action;
  operation: string;
  payload: Record<string, unknown>;
};

export const DASHBOARD_ACTIONS: DashboardActionDefinition[] = [
  {
    id: "buyer-create-order",
    label: "Create Buyer Order",
    domain: "buyer",
    subject: "BUYER_ORDERS",
    action: "CREATE",
    operation: "createOrder",
    payload: { supplierId: "usr-supplier-1", amount: 1999 },
  },
  {
    id: "supplier-upsert-product",
    label: "Upsert Supplier Product",
    domain: "supplier",
    subject: "SUPPLIER_PRODUCTS",
    action: "UPDATE",
    operation: "upsertProduct",
    payload: { productId: "PRD-10", sku: "INV-AU-001", name: "Inverter v2" },
  },
  {
    id: "freight-update-shipment",
    label: "Mark Shipment Delivered",
    domain: "freight",
    subject: "FREIGHT_SHIPMENTS",
    action: "UPDATE",
    operation: "updateShipment",
    payload: { shipmentId: "SHP-10", state: "DELIVERED" },
  },
  {
    id: "installer-confirmation",
    label: "Confirm Installation",
    domain: "installer",
    subject: "INSTALLER_CONFIRMATIONS",
    action: "CONFIRM",
    operation: "confirmInstallation",
    payload: { confirmationId: "INS-10" },
  },
  {
    id: "finance-release-settlement",
    label: "Release Settlement",
    domain: "finance",
    subject: "FINANCE_SETTLEMENTS",
    action: "RELEASE",
    operation: "releaseSettlement",
    payload: { settlementId: "SET-10" },
  },
  {
    id: "finance-update-pricing",
    label: "Update Pricing Rule",
    domain: "finance",
    subject: "FINANCE_PRICING_RULES",
    action: "UPDATE",
    operation: "updatePricingRule",
    payload: { pricingRuleId: "PRC-10", multiplier: 1.05 },
  },
  {
    id: "marketing-create-promotion",
    label: "Create Promotion",
    domain: "marketing",
    subject: "MARKETING_PROMOTIONS",
    action: "CREATE",
    operation: "createPromotion",
    payload: { code: "SAVE7" },
  },
  {
    id: "marketing-create-email",
    label: "Create Email Campaign",
    domain: "marketing",
    subject: "MARKETING_EMAILS",
    action: "CREATE",
    operation: "createEmail",
    payload: { subject: "Operational update" },
  },
];

