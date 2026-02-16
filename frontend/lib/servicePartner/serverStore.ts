import { ServicePartnerComplianceProfile, AdminAuditLog } from "../store";
import { getDb } from "../db/mongo";
import { assertNoMoneyFields } from "./noMoneyGuard";

const PROFILE_COLLECTION = "service_partner_compliance_profiles";
const AUDIT_COLLECTION = "service_partner_admin_audit_logs";

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      await db.collection(PROFILE_COLLECTION).createIndex({ partnerId: 1 }, { unique: true, name: "partnerId_unique" });
      await db.collection(PROFILE_COLLECTION).createIndex({ status: 1, updatedAt: -1 }, { name: "status_updatedAt" });
      await db.collection(PROFILE_COLLECTION).createIndex(
        { "identity.legalName": 1 },
        { name: "identity_legalName" }
      );
      await db.collection(PROFILE_COLLECTION).createIndex({ _migrationId: 1 }, { name: "profile_migrationId" });
      await db
        .collection(AUDIT_COLLECTION)
        .createIndex({ id: 1 }, { unique: true, name: "audit_id_unique" });
      await db
        .collection(AUDIT_COLLECTION)
        .createIndex({ targetId: 1, createdAt: -1 }, { name: "targetId_createdAt" });
      await db.collection(AUDIT_COLLECTION).createIndex({ createdAt: -1 }, { name: "createdAt" });
      await db.collection(AUDIT_COLLECTION).createIndex({ action: 1, createdAt: -1 }, { name: "action_createdAt" });
      await db.collection(AUDIT_COLLECTION).createIndex({ _migrationId: 1 }, { name: "audit_migrationId" });

      await db.collection("service_partner_evidence").createIndex(
        { partnerId: 1, createdAt: -1 },
        { name: "sp_evidence_partner_createdAt" }
      );
      await db.collection("service_partner_evidence").createIndex(
        { taskId: 1, evidenceType: 1 },
        { name: "sp_evidence_task_type" }
      );
      await db.collection("service_partner_evidence").createIndex(
        { _migrationId: 1 },
        { name: "sp_evidence_migrationId" }
      );
      await db.collection("service_partner_documents").createIndex(
        { partnerId: 1, createdAt: -1 },
        { name: "sp_documents_partner_createdAt" }
      );
      await db.collection("service_partner_documents").createIndex(
        { documentType: 1, createdAt: -1 },
        { name: "sp_documents_type_createdAt" }
      );
      await db.collection("service_partner_documents").createIndex(
        { _migrationId: 1 },
        { name: "sp_documents_migrationId" }
      );
      await db.collection("service_partner_migration_runs").createIndex(
        { migrationId: 1 },
        { unique: true, name: "sp_migration_runs_id_unique" }
      );
      await db.collection("service_partner_migration_runs").createIndex(
        { createdAt: -1 },
        { name: "sp_migration_runs_createdAt" }
      );
      await db.collection("service_partner_migration_schedule").createIndex({ _id: 1 }, { name: "sp_migration_schedule_id" });
    })();
  }
  await indexesReady;
}

export async function getComplianceProfiles(): Promise<ServicePartnerComplianceProfile[]> {
  await ensureIndexes();
  const db = await getDb();
  const docs = (await db
    .collection(PROFILE_COLLECTION)
    .find({})
    .sort({ updatedAt: -1 })
    .toArray()) as any[];
  return docs.map(({ _id, ...rest }) => {
    assertNoMoneyFields(rest, "service_partner_compliance_profile_read");
    return rest as ServicePartnerComplianceProfile;
  });
}

export async function getComplianceProfile(partnerId: string): Promise<ServicePartnerComplianceProfile | null> {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db.collection<ServicePartnerComplianceProfile>(PROFILE_COLLECTION).findOne({ partnerId });
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  assertNoMoneyFields(rest, "service_partner_compliance_profile_read");
  return rest as ServicePartnerComplianceProfile;
}

export async function upsertComplianceProfile(profile: ServicePartnerComplianceProfile): Promise<ServicePartnerComplianceProfile> {
  await ensureIndexes();
  assertNoMoneyFields(profile, "service_partner_compliance_profile");
  const db = await getDb();
  const next = { ...profile, updatedAt: new Date().toISOString() };
  await db
    .collection<ServicePartnerComplianceProfile>(PROFILE_COLLECTION)
    .updateOne({ partnerId: profile.partnerId }, { $set: next }, { upsert: true });
  return next;
}

export async function getAuditLogs(options: { partnerId?: string; limit?: number } = {}): Promise<AdminAuditLog[]> {
  await ensureIndexes();
  const db = await getDb();
  const query: Record<string, string> = {};
  if (options.partnerId) query.targetId = options.partnerId;
  const cursor = db.collection<AdminAuditLog>(AUDIT_COLLECTION).find(query).sort({ createdAt: -1 });
  if (options.limit) cursor.limit(options.limit);
  const docs = (await cursor.toArray()) as any[];
  return docs.map(({ _id, ...rest }) => rest as AdminAuditLog);
}

export async function appendAuditLog(log: AdminAuditLog): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  await db.collection<AdminAuditLog>(AUDIT_COLLECTION).insertOne(log);
}
