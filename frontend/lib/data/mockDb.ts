import crypto from "node:crypto";
import type { RoleName } from "../rbac/types";

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: RoleName;
};

export type BuyerOrderRecord = {
  id: string;
  buyerId: string;
  supplierId: string;
  status: "PENDING" | "PAID" | "HELD" | "SETTLED";
  amount: number;
  pricingSnapshotHash: string;
};

export type BuyerDocumentRecord = {
  id: string;
  buyerId: string;
  title: string;
  url: string;
};

export type SupplierProductRecord = {
  id: string;
  supplierId: string;
  sku: string;
  name: string;
  active: boolean;
};

export type SupplierComplianceRecord = {
  id: string;
  supplierId: string;
  certificateType: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
};

export type FreightShipmentRecord = {
  id: string;
  ownerId: string;
  orderId: string;
  lane: "SEA" | "AIR";
  state: "FREIGHT_PENDING" | "IN_TRANSIT" | "DELIVERED";
};

export type InstallerConfirmationRecord = {
  id: string;
  ownerId: string;
  orderId: string;
  status: "PENDING" | "CONFIRMED";
};

export type SettlementRecord = {
  id: string;
  ownerId: string;
  orderId: string;
  state: "PENDING" | "RELEASED";
  amount: number;
};

export type PricingRuleRecord = {
  id: string;
  ownerId: string;
  code: string;
  multiplier: number;
};

export type PromotionRecord = {
  id: string;
  ownerId: string;
  code: string;
  enabled: boolean;
};

export type MarketingEmailRecord = {
  id: string;
  ownerId: string;
  subject: string;
  state: "DRAFT" | "SCHEDULED" | "SENT";
};

type DbState = {
  users: UserRecord[];
  buyerOrders: BuyerOrderRecord[];
  buyerDocuments: BuyerDocumentRecord[];
  supplierProducts: SupplierProductRecord[];
  supplierCompliance: SupplierComplianceRecord[];
  freightShipments: FreightShipmentRecord[];
  installerConfirmations: InstallerConfirmationRecord[];
  settlements: SettlementRecord[];
  pricingRules: PricingRuleRecord[];
  promotions: PromotionRecord[];
  marketingEmails: MarketingEmailRecord[];
};

const seed: DbState = {
  users: [
    { id: "usr-buyer-1", email: "buyer@redroo.test", name: "Buyer One", role: "BUYER" },
    { id: "usr-supplier-1", email: "supplier@redroo.test", name: "Supplier One", role: "SUPPLIER" },
    { id: "usr-freight-1", email: "freight@redroo.test", name: "Freight One", role: "FREIGHT" },
    { id: "usr-installer-1", email: "installer@redroo.test", name: "Installer One", role: "INSTALLER" },
    { id: "usr-dev-1", email: "developer@redroo.test", name: "Developer Account", role: "DEVELOPER" },
    { id: "usr-admin-1", email: "admin@redroo.test", name: "Admin One", role: "RRE_ADMIN" },
    { id: "usr-finance-1", email: "finance@redroo.test", name: "Finance One", role: "RRE_FINANCE" },
    { id: "usr-ceo-1", email: "ceo@redroo.test", name: "CEO One", role: "RRE_CEO" },
    { id: "usr-marketing-1", email: "marketing@redroo.test", name: "Marketing One", role: "RRE_MARKETING" },
  ],
  buyerOrders: [
    {
      id: "ORD-3001",
      buyerId: "usr-buyer-1",
      supplierId: "usr-supplier-1",
      status: "PAID",
      amount: 1825,
      pricingSnapshotHash: crypto.createHash("sha256").update("ORD-3001:1825").digest("hex"),
    },
  ],
  buyerDocuments: [{ id: "DOC-10", buyerId: "usr-buyer-1", title: "Escrow Statement", url: "/docs/escrow-statement.pdf" }],
  supplierProducts: [{ id: "PRD-10", supplierId: "usr-supplier-1", sku: "INV-AU-001", name: "Inverter", active: true }],
  supplierCompliance: [
    { id: "CMP-10", supplierId: "usr-supplier-1", certificateType: "ISO 9001", status: "APPROVED" },
  ],
  freightShipments: [{ id: "SHP-10", ownerId: "usr-freight-1", orderId: "ORD-3001", lane: "SEA", state: "IN_TRANSIT" }],
  installerConfirmations: [{ id: "INS-10", ownerId: "usr-installer-1", orderId: "ORD-3001", status: "PENDING" }],
  settlements: [{ id: "SET-10", ownerId: "usr-finance-1", orderId: "ORD-3001", state: "PENDING", amount: 1825 }],
  pricingRules: [{ id: "PRC-10", ownerId: "usr-finance-1", code: "STD-AU", multiplier: 1 }],
  promotions: [{ id: "MKT-10", ownerId: "usr-marketing-1", code: "WELCOME5", enabled: true }],
  marketingEmails: [{ id: "EML-10", ownerId: "usr-marketing-1", subject: "Quarterly deals", state: "DRAFT" }],
};

const db: DbState = {
  users: [...seed.users],
  buyerOrders: [...seed.buyerOrders],
  buyerDocuments: [...seed.buyerDocuments],
  supplierProducts: [...seed.supplierProducts],
  supplierCompliance: [...seed.supplierCompliance],
  freightShipments: [...seed.freightShipments],
  installerConfirmations: [...seed.installerConfirmations],
  settlements: [...seed.settlements],
  pricingRules: [...seed.pricingRules],
  promotions: [...seed.promotions],
  marketingEmails: [...seed.marketingEmails],
};

export function findUserByEmail(email: string) {
  return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
}

export function findUserById(userId: string) {
  return db.users.find((user) => user.id === userId) || null;
}

export function getDb() {
  return db;
}

export function getSafeSnapshot() {
  return {
    users: db.users.map((row) => ({ ...row })),
    buyerOrders: db.buyerOrders.map((row) => ({ ...row })),
    buyerDocuments: db.buyerDocuments.map((row) => ({ ...row })),
    supplierProducts: db.supplierProducts.map((row) => ({ ...row })),
    supplierCompliance: db.supplierCompliance.map((row) => ({ ...row })),
    freightShipments: db.freightShipments.map((row) => ({ ...row })),
    installerConfirmations: db.installerConfirmations.map((row) => ({ ...row })),
    settlements: db.settlements.map((row) => ({ ...row })),
    pricingRules: db.pricingRules.map((row) => ({ ...row })),
    promotions: db.promotions.map((row) => ({ ...row })),
    marketingEmails: db.marketingEmails.map((row) => ({ ...row })),
  };
}
