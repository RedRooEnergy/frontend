import type { ScopeResolvers } from "./guards";
import { getDb } from "../db/mongo";

function match(ref: string | undefined, recipient: string) {
  if (!ref) return false;
  return String(ref) === String(recipient);
}

function matchAny(refs: Array<string | undefined>, recipient: string) {
  return refs.some((ref) => match(ref, recipient));
}

async function tryGetDb() {
  try {
    return await getDb();
  } catch {
    return null;
  }
}

export const scopeResolvers: ScopeResolvers = {
  async isBuyerSelf({ recipientUserId, recipientEmail, entityRefs }) {
    if (matchAny([entityRefs.buyerId, entityRefs.buyerUserId], recipientUserId)) return true;
    if (recipientEmail && match(entityRefs.buyerEmail, recipientEmail)) return true;

    const db = await tryGetDb();
    if (!db) return false;

    const buyerId = entityRefs.buyerId || entityRefs.buyerUserId;
    const buyerEmail = entityRefs.buyerEmail;
    if (!buyerId && !buyerEmail) return false;

    const buyer = await db.collection("buyers").findOne({
      ...(buyerId ? { buyerId } : {}),
      ...(buyerEmail ? { email: buyerEmail } : {}),
    });
    if (!buyer) return false;
    return match(buyer.buyerId, recipientUserId) || (recipientEmail ? match(buyer.email, recipientEmail) : false);
  },

  async isSupplierUserForSupplier({ recipientUserId, recipientEmail, entityRefs }) {
    if (entityRefs.supplierUserId && match(entityRefs.supplierUserId, recipientUserId)) return true;
    if (recipientEmail && entityRefs.supplierEmail && match(entityRefs.supplierEmail, recipientEmail)) return true;

    const db = await tryGetDb();
    if (!db) return false;

    const supplierId = entityRefs.supplierId || entityRefs.supplierCompanyId;
    if (!supplierId) return false;

    const supplier = await db.collection("supplier_company_profiles").findOne({ supplierId });
    if (!supplier) return false;

    if (match(supplier.supplierId, recipientUserId)) return true;
    if (recipientEmail && supplier.contacts?.primaryEmail && match(supplier.contacts.primaryEmail, recipientEmail)) {
      return true;
    }
    return false;
  },

  async isPartnerUserForPartner({ recipientUserId, recipientEmail, entityRefs }) {
    if (entityRefs.partnerUserId && match(entityRefs.partnerUserId, recipientUserId)) return true;
    if (recipientEmail && entityRefs.partnerEmail && match(entityRefs.partnerEmail, recipientEmail)) return true;

    const db = await tryGetDb();
    if (!db) return false;

    const partnerId = entityRefs.partnerId || entityRefs.partnerCompanyId;
    if (!partnerId) return false;

    const partner = await db.collection("service_partner_compliance_profiles").findOne({ partnerId });
    if (!partner) return false;

    if (match(partner.partnerId, recipientUserId)) return true;
    if (recipientEmail && partner.identity?.contactEmail && match(partner.identity.contactEmail, recipientEmail)) {
      return true;
    }
    return false;
  },

  async isAdminUser({ recipientUserId, recipientEmail }) {
    if (recipientUserId) return true;
    if (recipientEmail) return true;
    return false;
  },
};
