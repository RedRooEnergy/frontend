import { getDb } from "../db/mongo";

type Recipient = {
  userId: string;
  email: string;
  displayName?: string;
};

function looksLikeEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export async function resolveSupplierRecipient(supplierId: string): Promise<Recipient | null> {
  if (!supplierId) return null;
  if (looksLikeEmail(supplierId)) {
    return { userId: supplierId, email: supplierId };
  }

  try {
    const db = await getDb();
    const profile = await db.collection("supplier_company_profiles").findOne({ supplierId });
    const email = profile?.contacts?.primaryEmail;
    if (!email || !looksLikeEmail(email)) return null;
    const displayName =
      profile?.identity?.brandName ||
      profile?.identity?.tradingName ||
      profile?.identity?.legalNameEnglish ||
      profile?.identity?.legalNameNative ||
      undefined;
    return { userId: supplierId, email, displayName };
  } catch {
    return null;
  }
}
