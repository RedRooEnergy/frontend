import { getDb } from "../db/mongo";
import {
  CompliancePartnerRecord,
  CompliancePartnerStatus,
  CompliancePartnerStatusLog,
} from "./types";

const REGISTRY_COLLECTION = "compliance_partner_registry";
const STATUS_LOG_COLLECTION = "compliance_partner_status_logs";

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      await db.collection(REGISTRY_COLLECTION).createIndex({ id: 1 }, { unique: true, name: "partner_id_unique" });
      await db.collection(REGISTRY_COLLECTION).createIndex({ status: 1, updatedAt: -1 }, { name: "status_updatedAt" });
      await db.collection(REGISTRY_COLLECTION).createIndex(
        { "scopes.certifications": 1 },
        { name: "certifications_scope" }
      );
      await db.collection(REGISTRY_COLLECTION).createIndex(
        { "scopes.productCategories": 1 },
        { name: "productCategories_scope" }
      );
      await db.collection(REGISTRY_COLLECTION).createIndex(
        { "offices.city": 1, "offices.state": 1 },
        { name: "office_city_state" }
      );
      await db.collection(STATUS_LOG_COLLECTION).createIndex(
        { partnerId: 1, createdAt: -1 },
        { name: "statuslog_partner_createdAt" }
      );
    })();
  }
  await indexesReady;
}

export async function listCompliancePartners(filters: {
  status?: CompliancePartnerStatus;
  certification?: string;
  category?: string;
  jurisdiction?: string;
  city?: string;
} = {}): Promise<CompliancePartnerRecord[]> {
  await ensureIndexes();
  const db = await getDb();
  const query: Record<string, any> = {};
  if (filters.status) query.status = filters.status;
  if (filters.certification) query["scopes.certifications"] = filters.certification;
  if (filters.category) query["scopes.productCategories"] = filters.category;
  if (filters.jurisdiction) query.jurisdiction = filters.jurisdiction;
  if (filters.city) query["offices.city"] = filters.city;
  const docs = (await db.collection(REGISTRY_COLLECTION).find(query).sort({ "audit.updatedAt": -1 }).toArray()) as any[];
  return docs.map(({ _id, ...rest }) => rest as CompliancePartnerRecord);
}

export async function getCompliancePartner(id: string): Promise<CompliancePartnerRecord | null> {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db.collection(REGISTRY_COLLECTION).findOne({ id });
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return rest as CompliancePartnerRecord;
}

export async function createCompliancePartner(record: CompliancePartnerRecord): Promise<CompliancePartnerRecord> {
  await ensureIndexes();
  const db = await getDb();
  const existing = await db.collection(REGISTRY_COLLECTION).findOne({ id: record.id });
  if (existing) {
    throw new Error(`Compliance partner ${record.id} already exists`);
  }
  await db.collection(REGISTRY_COLLECTION).insertOne(record);
  return record;
}

export async function updateCompliancePartner(
  id: string,
  updates: Partial<CompliancePartnerRecord>
): Promise<CompliancePartnerRecord> {
  await ensureIndexes();
  const db = await getDb();
  const existing = await db.collection<CompliancePartnerRecord>(REGISTRY_COLLECTION).findOne({ id });
  if (!existing) throw new Error("PARTNER_NOT_FOUND");
  if (existing.audit?.locked) throw new Error("PARTNER_LOCKED");

  const next: CompliancePartnerRecord = {
    ...existing,
    ...updates,
    audit: {
      ...existing.audit,
      updatedAt: updates.audit?.updatedAt || new Date().toISOString(),
      updatedBy: updates.audit?.updatedBy || existing.audit.updatedBy,
      locked: existing.audit.locked,
      lockedAt: existing.audit.lockedAt,
      lockedBy: existing.audit.lockedBy,
    },
  };

  await db.collection(REGISTRY_COLLECTION).updateOne({ id }, { $set: next });
  return next;
}

export async function lockCompliancePartner(id: string, actorId: string): Promise<CompliancePartnerRecord> {
  await ensureIndexes();
  const db = await getDb();
  const existing = await db.collection<CompliancePartnerRecord>(REGISTRY_COLLECTION).findOne({ id });
  if (!existing) throw new Error("PARTNER_NOT_FOUND");

  const now = new Date().toISOString();
  const next: CompliancePartnerRecord = {
    ...existing,
    audit: {
      ...existing.audit,
      locked: true,
      lockedAt: now,
      lockedBy: actorId,
      updatedAt: now,
      updatedBy: actorId,
    },
  };
  await db.collection(REGISTRY_COLLECTION).updateOne({ id }, { $set: next });
  return next;
}

export async function setCompliancePartnerStatus(
  id: string,
  status: CompliancePartnerStatus,
  actorId: string,
  reasonCode?: string,
  notes?: string
): Promise<CompliancePartnerRecord> {
  await ensureIndexes();
  const db = await getDb();
  const existing = await db.collection<CompliancePartnerRecord>(REGISTRY_COLLECTION).findOne({ id });
  if (!existing) throw new Error("PARTNER_NOT_FOUND");

  const now = new Date().toISOString();
  const next: CompliancePartnerRecord = {
    ...existing,
    status,
    audit: {
      ...existing.audit,
      updatedAt: now,
      updatedBy: actorId,
    },
  };
  await db.collection(REGISTRY_COLLECTION).updateOne({ id }, { $set: next });

  const log: CompliancePartnerStatusLog = {
    partnerId: id,
    previousStatus: existing.status,
    newStatus: status,
    reasonCode,
    notes,
    actorId,
    createdAt: now,
  };
  await db.collection(STATUS_LOG_COLLECTION).insertOne(log);

  return next;
}

export async function listCompliancePartnerStatusLogs(partnerId: string): Promise<CompliancePartnerStatusLog[]> {
  await ensureIndexes();
  const db = await getDb();
  const docs = (await db
    .collection(STATUS_LOG_COLLECTION)
    .find({ partnerId })
    .sort({ createdAt: -1 })
    .toArray()) as any[];
  return docs.map(({ _id, ...rest }) => rest as CompliancePartnerStatusLog);
}
