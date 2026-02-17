import { ObjectId } from "mongodb";
import { getDb } from "../db/mongo";

const COLLECTION = "crm_cases";

export type CrmCaseView = {
  caseId: string;
  entityType: string;
  entityId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type CrmCaseDoc = {
  _id?: ObjectId;
  entityType?: unknown;
  entityId?: unknown;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function toView(row: CrmCaseDoc): CrmCaseView {
  if (!row._id) {
    throw new Error("CRM_CASE_ROW_MISSING_ID");
  }

  return {
    caseId: row._id.toString(),
    entityType: String(row.entityType ?? ""),
    entityId: String(row.entityId ?? ""),
    status: String(row.status ?? "OPEN"),
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  };
}

export async function getCrmCaseById(id: string): Promise<CrmCaseView | null> {
  let _id: ObjectId;
  try {
    _id = new ObjectId(id);
  } catch {
    return null;
  }

  const db = await getDb();
  const col = db.collection<CrmCaseDoc>(COLLECTION);
  const found = await col.findOne({ _id });
  if (!found) return null;

  return toView(found);
}

export async function listCrmCasesByEntity(entityType?: string, entityId?: string): Promise<CrmCaseView[]> {
  const db = await getDb();
  const col = db.collection<CrmCaseDoc>(COLLECTION);

  const filter: Record<string, string> = {};
  if (entityType && entityType.trim().length > 0) {
    filter.entityType = entityType.trim();
  }
  if (entityId && entityId.trim().length > 0) {
    filter.entityId = entityId.trim();
  }

  const rows = await col.find(filter).sort({ createdAt: -1 }).toArray();
  return rows.map(toView);
}
