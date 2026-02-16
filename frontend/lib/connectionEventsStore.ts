import crypto from "crypto";
import { getDb } from "./db/mongo";
import { getComplianceProfile } from "./servicePartner/serverStore";

export type ConnectionSourceType = "buyer" | "supplier";
export type ConnectionEngagementType = "lead" | "referral" | "request" | "call" | "email" | "visit";
export type ConnectionStatus = "tracked" | "billed" | "closed";
export type ConnectionCreatedByRole = "admin" | "system";

export type ConnectionEvent = {
  _id?: string;
  sourceType: ConnectionSourceType;
  sourceId: string;
  servicePartnerId: string;
  engagementType: ConnectionEngagementType;
  eventAt: string;
  feePercent: number;
  status: ConnectionStatus;
  notes?: string;
  createdByRole: ConnectionCreatedByRole;
  createdById?: string | null;
  auditHash: string;
};

const COLLECTION = "connection_events";

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      await db.collection(COLLECTION).createIndex({ servicePartnerId: 1, eventAt: -1 }, { name: "sp_eventAt" });
      await db.collection(COLLECTION).createIndex({ sourceType: 1, eventAt: -1 }, { name: "source_eventAt" });
      await db.collection(COLLECTION).createIndex({ status: 1, eventAt: -1 }, { name: "status_eventAt" });
    })();
  }
  await indexesReady;
}

function sortKeys(input: any): any {
  if (Array.isArray(input)) {
    return input.map(sortKeys);
  }
  if (input && typeof input === "object") {
    return Object.keys(input)
      .sort()
      .reduce((acc: any, key) => {
        acc[key] = sortKeys(input[key]);
        return acc;
      }, {});
  }
  return input;
}

function stableStringify(input: any) {
  return JSON.stringify(sortKeys(input));
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeDate(value?: string | Date | null) {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

export async function createConnectionEvent(input: {
  sourceType: ConnectionSourceType;
  sourceId: string;
  servicePartnerId: string;
  engagementType: ConnectionEngagementType;
  eventAt?: string | Date | null;
  status?: ConnectionStatus;
  notes?: string;
  createdByRole: ConnectionCreatedByRole;
  createdById?: string | null;
}) {
  await ensureIndexes();
  if (!input.servicePartnerId) throw new Error("servicePartnerId required");
  if (!input.sourceType || !input.sourceId) throw new Error("sourceType/sourceId required");
  if (!input.engagementType) throw new Error("engagementType required");

  const profile = await getComplianceProfile(input.servicePartnerId);
  if (!profile || !["APPROVED", "ACTIVE"].includes(profile.status)) {
    throw new Error("Service partner is not approved/active");
  }

  const event: ConnectionEvent = {
    sourceType: input.sourceType,
    sourceId: String(input.sourceId),
    servicePartnerId: String(input.servicePartnerId),
    engagementType: input.engagementType,
    eventAt: normalizeDate(input.eventAt),
    feePercent: 1,
    status: input.status || "tracked",
    notes: input.notes?.trim() || "",
    createdByRole: input.createdByRole,
    createdById: input.createdById || null,
    auditHash: "",
  };

  const auditPayload = stableStringify({
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    servicePartnerId: event.servicePartnerId,
    engagementType: event.engagementType,
    eventAt: event.eventAt,
    feePercent: event.feePercent,
    status: event.status,
    notes: event.notes,
    createdByRole: event.createdByRole,
    createdById: event.createdById,
  });
  event.auditHash = sha256(auditPayload);

  const db = await getDb();
  const result = await db.collection<ConnectionEvent>(COLLECTION).insertOne(event as any);
  return { ...event, _id: result.insertedId.toString() };
}

export async function listConnectionEvents(filters: {
  servicePartnerId?: string;
  sourceType?: ConnectionSourceType;
  status?: ConnectionStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
} = {}) {
  await ensureIndexes();
  const db = await getDb();
  const query: Record<string, any> = {};

  if (filters.servicePartnerId) query.servicePartnerId = String(filters.servicePartnerId);
  if (filters.sourceType) query.sourceType = filters.sourceType;
  if (filters.status) query.status = filters.status;

  if (filters.startDate || filters.endDate) {
    query.eventAt = {};
    if (filters.startDate) query.eventAt.$gte = normalizeDate(filters.startDate);
    if (filters.endDate) query.eventAt.$lte = normalizeDate(filters.endDate);
  }

  const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
  const page = Math.max(filters.page || 1, 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    db.collection<ConnectionEvent>(COLLECTION).find(query).sort({ eventAt: -1 }).skip(skip).limit(limit).toArray(),
    db.collection<ConnectionEvent>(COLLECTION).countDocuments(query),
  ]);

  return {
    items: items.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() })),
    total,
    page,
    limit,
  };
}

export async function summarizeConnectionEvents(filters: {
  servicePartnerId?: string;
  sourceType?: ConnectionSourceType;
  engagementType?: ConnectionEngagementType;
  status?: ConnectionStatus;
  startDate?: string;
  endDate?: string;
} = {}) {
  await ensureIndexes();
  const db = await getDb();
  const match: Record<string, any> = {};
  if (filters.servicePartnerId) match.servicePartnerId = String(filters.servicePartnerId);
  if (filters.sourceType) match.sourceType = filters.sourceType;
  if (filters.engagementType) match.engagementType = filters.engagementType;
  if (filters.status) match.status = filters.status;
  if (filters.startDate || filters.endDate) {
    match.eventAt = {};
    if (filters.startDate) match.eventAt.$gte = normalizeDate(filters.startDate);
    if (filters.endDate) match.eventAt.$lte = normalizeDate(filters.endDate);
  }

  const total = await db.collection(COLLECTION).countDocuments(match);

  const byServicePartner = await db
    .collection(COLLECTION)
    .aggregate([{ $match: match }, { $group: { _id: "$servicePartnerId", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray();

  const byEngagementType = await db
    .collection(COLLECTION)
    .aggregate([{ $match: match }, { $group: { _id: "$engagementType", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray();

  const bySourceType = await db
    .collection(COLLECTION)
    .aggregate([{ $match: match }, { $group: { _id: "$sourceType", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray();

  const byWeek = await db
    .collection(COLLECTION)
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $isoWeekYear: { $toDate: "$eventAt" } }, week: { $isoWeek: { $toDate: "$eventAt" } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.week": -1 } },
    ])
    .toArray();

  const weekBuckets = byWeek.map((row) => ({
    week: `${row._id.year}-W${String(row._id.week).padStart(2, "0")}`,
    count: row.count,
  }));

  return {
    total,
    byServicePartner: byServicePartner.map((row) => ({ servicePartnerId: row._id, count: row.count })),
    byEngagementType: byEngagementType.map((row) => ({ engagementType: row._id, count: row.count })),
    bySourceType: bySourceType.map((row) => ({ sourceType: row._id, count: row.count })),
    byWeek: weekBuckets,
  };
}
