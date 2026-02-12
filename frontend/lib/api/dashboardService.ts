import { getAuditLog } from "../rbac/audit";
import { authorizeOrThrow } from "../rbac/policy";
import { getDb, getSafeSnapshot, type BuyerOrderRecord } from "../data/mockDb";
import { DOMAIN_SUBJECTS } from "../rbac/matrix";
import { AccessDeniedError } from "../rbac/errors";
import type { Actor, DashboardDomain } from "../rbac/types";

function toOrderResponse(order: BuyerOrderRecord) {
  return {
    id: order.id,
    status: order.status,
    amount: order.amount,
    pricingSnapshotHash: order.pricingSnapshotHash,
    supplierId: order.supplierId,
  };
}

export function listDashboardData(actor: Actor, domain: DashboardDomain) {
  const snapshot = getSafeSnapshot();
  const domainSubjects = DOMAIN_SUBJECTS[domain];
  const readableSubjects = domainSubjects.filter((subject) => {
    try {
      authorizeOrThrow(actor, subject, "READ");
      return true;
    } catch {
      return false;
    }
  });
  const readableSet = new Set(readableSubjects);
  const canRead = (subject: (typeof domainSubjects)[number]) => readableSet.has(subject);

  if (!readableSubjects.length) {
    throw new AccessDeniedError(`Role ${actor.role} does not have READ access to dashboard domain ${domain}`);
  }

  switch (domain) {
    case "buyer":
      return {
        domain,
        data: {
          orders: snapshot.buyerOrders.filter((order) => order.buyerId === actor.userId).map(toOrderResponse),
          documents: snapshot.buyerDocuments.filter((doc) => doc.buyerId === actor.userId),
          complianceDocuments: [
            { id: "CMP-DOC-01", title: "Buyer Platform Terms", url: "/compliance#buyer-terms" },
            { id: "CMP-DOC-02", title: "Escrow Policy", url: "/compliance#escrow-policy" },
          ],
        },
      };
    case "supplier":
      return {
        domain,
        data: {
          products: snapshot.supplierProducts.filter((row) => row.supplierId === actor.userId),
          compliance: snapshot.supplierCompliance.filter((row) => row.supplierId === actor.userId),
          orders: snapshot.buyerOrders.filter((order) => order.supplierId === actor.userId).map(toOrderResponse),
        },
      };
    case "freight":
      return {
        domain,
        data: {
          shipments: snapshot.freightShipments.filter(
            (row) => row.ownerId === actor.userId || actor.roles.includes("RRE_ADMIN")
          ),
          linkedOrders: snapshot.buyerOrders.map(toOrderResponse),
        },
      };
    case "installer":
      return {
        domain,
        data: {
          confirmations: snapshot.installerConfirmations.filter(
            (row) => row.ownerId === actor.userId || actor.roles.includes("RRE_ADMIN")
          ),
        },
      };
    case "admin":
      // Admin domain is compositional: only include data for subjects actor can actually read.
      return {
        domain,
        data: {
          ...(canRead("ADMIN_OPERATIONS")
            ? {
                operations: [
                  { id: "OPS-001", message: "Compliance queue review", state: "OPEN" },
                  { id: "OPS-002", message: "Freight escalation triage", state: "OPEN" },
                ],
              }
            : {}),
          ...(canRead("BUYER_ORDERS") ? { orders: snapshot.buyerOrders.map(toOrderResponse) } : {}),
          ...(canRead("AUDIT_LOGS") ? { auditTrailCount: getAuditLog().length } : {}),
        },
      };
    case "finance":
      return {
        domain,
        data: {
          settlements: snapshot.settlements,
          pricingRules: snapshot.pricingRules,
        },
      };
    case "ceo":
      return {
        domain,
        data: {
          summary: {
            totalOrders: snapshot.buyerOrders.length,
            totalShipments: snapshot.freightShipments.length,
            totalSettlements: snapshot.settlements.length,
            totalPromotions: snapshot.promotions.length,
          },
          readOnly: true,
        },
      };
    case "marketing":
      return {
        domain,
        data: {
          promotions: snapshot.promotions.filter(
            (row) => row.ownerId === actor.userId || actor.roles.includes("RRE_ADMIN")
          ),
          emails: snapshot.marketingEmails.filter((row) => row.ownerId === actor.userId || actor.roles.includes("RRE_ADMIN")),
        },
      };
    case "regulator":
      return {
        domain,
        data: {
          ...(canRead("BUYER_ORDERS") ? { orders: snapshot.buyerOrders.map(toOrderResponse) } : {}),
          ...(canRead("BUYER_DOCUMENTS")
            ? {
                buyerDocuments: snapshot.buyerDocuments.map((row) => ({
                  id: row.id,
                  buyerId: row.buyerId,
                  title: row.title,
                  url: row.url,
                })),
              }
            : {}),
          ...(canRead("SUPPLIER_COMPLIANCE")
            ? {
                supplierCompliance: snapshot.supplierCompliance.map((row) => ({
                  id: row.id,
                  supplierId: row.supplierId,
                  certificateType: row.certificateType,
                  status: row.status,
                })),
              }
            : {}),
          ...(canRead("FREIGHT_SHIPMENTS") ? { freightShipments: snapshot.freightShipments } : {}),
          ...(canRead("INSTALLER_CONFIRMATIONS") ? { installerConfirmations: snapshot.installerConfirmations } : {}),
          ...(canRead("FINANCE_SETTLEMENTS") ? { settlements: snapshot.settlements } : {}),
          ...(canRead("COMPLIANCE_DOCUMENTS")
            ? {
                complianceDocuments: [
                  { id: "CMP-DOC-01", title: "Buyer Platform Terms", url: "/compliance#buyer-terms" },
                  { id: "CMP-DOC-02", title: "Escrow Policy", url: "/compliance#escrow-policy" },
                ],
              }
            : {}),
          ...(canRead("AUDIT_LOGS")
            ? {
                governanceAnchors: {
                  readOnly: true,
                  immutable: true,
                  evidenceRoute: "/portal/evidence",
                },
              }
            : {}),
        },
      };
    default:
      return { domain, data: {} };
  }
}

export function createBuyerOrder(actor: Actor, payload: { supplierId: string; amount: number }) {
  authorizeOrThrow(actor, "BUYER_ORDERS", "CREATE", { ownerId: actor.userId });
  const db = getDb();
  const next = `ORD-${3000 + db.buyerOrders.length + 1}`;
  const pricingSnapshotHash = `HASH-${next}-${payload.amount}`;
  const order = {
    id: next,
    buyerId: actor.userId,
    supplierId: payload.supplierId,
    status: "PENDING" as const,
    amount: payload.amount,
    pricingSnapshotHash,
  };
  db.buyerOrders.push(order);
  return toOrderResponse(order);
}

export function upsertSupplierProduct(actor: Actor, payload: { productId?: string; sku: string; name: string }) {
  const db = getDb();
  if (payload.productId) {
    const row = db.supplierProducts.find((item) => item.id === payload.productId);
    if (!row) throw new Error("Product not found");
    authorizeOrThrow(actor, "SUPPLIER_PRODUCTS", "UPDATE", { ownerId: row.supplierId, resourceId: row.id });
    row.sku = payload.sku;
    row.name = payload.name;
    return { ...row };
  }
  authorizeOrThrow(actor, "SUPPLIER_PRODUCTS", "CREATE", { ownerId: actor.userId });
  const created = {
    id: `PRD-${10 + db.supplierProducts.length + 1}`,
    supplierId: actor.userId,
    sku: payload.sku,
    name: payload.name,
    active: true,
  };
  db.supplierProducts.push(created);
  return { ...created };
}

export function updateFreightShipment(actor: Actor, shipmentId: string, nextState: "IN_TRANSIT" | "DELIVERED") {
  const db = getDb();
  const row = db.freightShipments.find((item) => item.id === shipmentId);
  if (!row) throw new Error("Shipment not found");
  authorizeOrThrow(actor, "FREIGHT_SHIPMENTS", "UPDATE", { ownerId: row.ownerId, resourceId: row.id });
  row.state = nextState;
  return { ...row };
}

export function confirmInstallerJob(actor: Actor, confirmationId: string) {
  const db = getDb();
  const row = db.installerConfirmations.find((item) => item.id === confirmationId);
  if (!row) throw new Error("Installer confirmation not found");
  authorizeOrThrow(actor, "INSTALLER_CONFIRMATIONS", "CONFIRM", { ownerId: row.ownerId, resourceId: row.id });
  row.status = "CONFIRMED";
  return { ...row };
}

export function releaseSettlement(actor: Actor, settlementId: string) {
  const db = getDb();
  const row = db.settlements.find((item) => item.id === settlementId);
  if (!row) throw new Error("Settlement not found");
  authorizeOrThrow(actor, "FINANCE_SETTLEMENTS", "RELEASE", { ownerId: row.ownerId, resourceId: row.id });
  row.state = "RELEASED";
  return { ...row };
}

export function updatePricingRule(actor: Actor, pricingRuleId: string, multiplier: number) {
  const db = getDb();
  const row = db.pricingRules.find((item) => item.id === pricingRuleId);
  if (!row) throw new Error("Pricing rule not found");
  authorizeOrThrow(actor, "FINANCE_PRICING_RULES", "UPDATE", { ownerId: row.ownerId, resourceId: row.id });
  row.multiplier = multiplier;
  return { ...row };
}

export function createPromotion(actor: Actor, code: string) {
  const db = getDb();
  authorizeOrThrow(actor, "MARKETING_PROMOTIONS", "CREATE", { ownerId: actor.userId });
  const created = { id: `MKT-${10 + db.promotions.length + 1}`, ownerId: actor.userId, code, enabled: true };
  db.promotions.push(created);
  return { ...created };
}

export function createMarketingEmail(actor: Actor, subjectLine: string) {
  const db = getDb();
  authorizeOrThrow(actor, "MARKETING_EMAILS", "CREATE", { ownerId: actor.userId });
  const created = {
    id: `EML-${10 + db.marketingEmails.length + 1}`,
    ownerId: actor.userId,
    subject: subjectLine,
    state: "DRAFT" as const,
  };
  db.marketingEmails.push(created);
  return { ...created };
}

export function listAuditLog(actor: Actor) {
  authorizeOrThrow(actor, "AUDIT_LOGS", "READ");
  return getAuditLog();
}
