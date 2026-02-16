import { getDb } from "../db/mongo";

const COLLECTION = "admin_audit_logs";

export type AuditEntry = {
  createdAt: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

function now() {
  return new Date().toISOString();
}

export async function writeAudit(entry: {
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const doc: AuditEntry = {
    ...entry,
    createdAt: now(),
  };

  await col.insertOne(doc);
}
