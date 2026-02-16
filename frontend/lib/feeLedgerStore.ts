import crypto from "crypto";
import { getDb } from "./db/mongo";

export type FeePolicyStatus = "DRAFT" | "LOCKED";
export type FeePolicyCurrency = "AUD" | "NZD";
export type FeePolicyBaseDefinition = "certificationFeeBase" | "orderSubtotalExGST" | "orderTotalIncGST";
export type FeePolicyTriggerEvent = "WF_CERTIFIED" | "PRODUCT_APPROVED" | "ORDER_PAID";

export type FeePolicy = {
  _id?: string;
  ruleId: string;
  percent: number;
  currencyScope: FeePolicyCurrency[];
  baseDefinition: FeePolicyBaseDefinition;
  triggerEvent: FeePolicyTriggerEvent;
  rounding: number;
  effectiveFrom: string;
  lockedHash?: string;
  status: FeePolicyStatus;
  createdAt: string;
  updatedAt: string;
};

export type FeeLedgerStatus = "PENDING" | "INVOICED" | "PAID" | "VOID";
export type FeeLedgerEventType =
  | "SUPPLIER_CERTIFICATION_FEE"
  | "PARTNER_LISTING_APPROVAL_FEE"
  | "INSTALLER_ORDER_SERVICE_FEE";
export type FeeLedgerActorRole = "supplier" | "service_partner" | "installer";
export type FeeLedgerEntityType = "ComplianceWorkflow" | "Product" | "Order";

export type FeeLedgerEvent = {
  _id?: string;
  eventId: string;
  eventType: FeeLedgerEventType;
  actorRole: FeeLedgerActorRole;
  actorId: string;
  relatedEntityType: FeeLedgerEntityType;
  relatedEntityId: string;
  baseAmount: number;
  feePercent: number;
  feeAmount: number;
  currency: FeePolicyCurrency;
  status: FeeLedgerStatus;
  idempotencyKey: string;
  auditHash: string;
  createdAt: string;
  createdByRole: "admin" | "system";
  createdById?: string | null;
};

export type ServicePartnerAccountLinkStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export type ServicePartnerAccountLink = {
  _id?: string;
  supplierId: string;
  servicePartnerId: string;
  status: ServicePartnerAccountLinkStatus;
  acceptedAt?: string | null;
  createdAt: string;
  createdBy: string;
};

const POLICY_COLLECTION = "fee_policies";
const LEDGER_COLLECTION = "fee_ledger_events";
const LINK_COLLECTION = "service_partner_account_links";

let indexesReady: Promise<void> | null = null;

const DEFAULT_POLICIES: FeePolicy[] = [
  {
    ruleId: "FEE-1PCT-SUPPLIER-CERT",
    percent: 0.01,
    currencyScope: ["AUD", "NZD"],
    baseDefinition: "certificationFeeBase",
    triggerEvent: "WF_CERTIFIED",
    rounding: 2,
    effectiveFrom: "2026-02-07",
    status: "LOCKED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    ruleId: "FEE-1PCT-PARTNER-APPROVAL",
    percent: 0.01,
    currencyScope: ["AUD", "NZD"],
    baseDefinition: "certificationFeeBase",
    triggerEvent: "PRODUCT_APPROVED",
    rounding: 2,
    effectiveFrom: "2026-02-07",
    status: "LOCKED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    ruleId: "FEE-1PCT-INSTALLER-ORDER",
    percent: 0.01,
    currencyScope: ["AUD", "NZD"],
    baseDefinition: "orderSubtotalExGST",
    triggerEvent: "ORDER_PAID",
    rounding: 2,
    effectiveFrom: "2026-02-07",
    status: "LOCKED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function sortKeys(input: any): any {
  if (Array.isArray(input)) return input.map(sortKeys);
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

function roundTo(amount: number, decimals: number) {
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

function normalizeCurrency(value?: string | null): FeePolicyCurrency {
  const upper = (value || "").toUpperCase();
  if (upper === "AUD" || upper === "NZD") return upper;
  return "AUD";
}

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      await db
        .collection(POLICY_COLLECTION)
        .createIndex({ ruleId: 1 }, { unique: true, name: "fee_policy_ruleId_unique" });
      await db
        .collection(POLICY_COLLECTION)
        .createIndex({ status: 1, updatedAt: -1 }, { name: "fee_policy_status_updatedAt" });

      await db
        .collection(LEDGER_COLLECTION)
        .createIndex({ idempotencyKey: 1 }, { unique: true, name: "fee_ledger_idempotency_unique" });
      await db
        .collection(LEDGER_COLLECTION)
        .createIndex({ actorRole: 1, actorId: 1, createdAt: -1 }, { name: "fee_ledger_actor_createdAt" });
      await db
        .collection(LEDGER_COLLECTION)
        .createIndex({ eventType: 1, createdAt: -1 }, { name: "fee_ledger_event_createdAt" });
      await db
        .collection(LEDGER_COLLECTION)
        .createIndex({ relatedEntityType: 1, relatedEntityId: 1 }, { name: "fee_ledger_related" });

      await db
        .collection(LINK_COLLECTION)
        .createIndex({ supplierId: 1, servicePartnerId: 1 }, { unique: true, name: "sp_link_supplier_partner_unique" });
      await db.collection(LINK_COLLECTION).createIndex({ status: 1, createdAt: -1 }, { name: "sp_link_status" });
      await db.collection(LINK_COLLECTION).createIndex({ supplierId: 1, createdAt: -1 }, { name: "sp_link_supplier" });
    })();
  }
  await indexesReady;
}

async function ensureDefaultPolicies() {
  await ensureIndexes();
  const db = await getDb();
  for (const policy of DEFAULT_POLICIES) {
    const existing = await db.collection<FeePolicy>(POLICY_COLLECTION).findOne({ ruleId: policy.ruleId });
    if (existing) continue;
    const lockedPayload = {
      ruleId: policy.ruleId,
      percent: policy.percent,
      currencyScope: policy.currencyScope,
      baseDefinition: policy.baseDefinition,
      triggerEvent: policy.triggerEvent,
      rounding: policy.rounding,
      effectiveFrom: policy.effectiveFrom,
      status: policy.status,
    };
    const lockedHash = sha256(stableStringify(lockedPayload));
    await db.collection<FeePolicy>(POLICY_COLLECTION).insertOne({
      ...policy,
      lockedHash,
    } as FeePolicy);
  }
}

function policyForEvent(triggerEvent: FeePolicyTriggerEvent) {
  return DEFAULT_POLICIES.find((p) => p.triggerEvent === triggerEvent)?.ruleId;
}

export async function getFeePolicy(ruleId: string) {
  await ensureDefaultPolicies();
  const db = await getDb();
  return db.collection<FeePolicy>(POLICY_COLLECTION).findOne({ ruleId });
}

export async function listFeePolicies() {
  await ensureDefaultPolicies();
  const db = await getDb();
  const docs = await db.collection<FeePolicy>(POLICY_COLLECTION).find({}).sort({ updatedAt: -1 }).toArray();
  return docs.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() }));
}

export async function emitFeeLedgerEvent(input: {
  triggerEvent: FeePolicyTriggerEvent;
  eventType: FeeLedgerEventType;
  actorRole: FeeLedgerActorRole;
  actorId: string;
  relatedEntityType: FeeLedgerEntityType;
  relatedEntityId: string;
  baseAmount: number;
  currency: FeePolicyCurrency;
  createdByRole: "admin" | "system";
  createdById?: string | null;
}) {
  await ensureDefaultPolicies();
  if (!input.actorId || !input.relatedEntityId) throw new Error("actorId/relatedEntityId required");
  if (!Number.isFinite(input.baseAmount) || input.baseAmount <= 0) throw new Error("baseAmount required");

  const ruleId = policyForEvent(input.triggerEvent);
  if (!ruleId) throw new Error("Policy not configured for trigger");
  const policy = await getFeePolicy(ruleId);
  if (!policy || policy.status !== "LOCKED") throw new Error("Fee policy not locked");

  const currency = normalizeCurrency(input.currency);
  if (!policy.currencyScope.includes(currency)) throw new Error("Currency not supported");

  const feePercent = policy.percent;
  const feeAmount = roundTo(input.baseAmount * feePercent, policy.rounding);
  const idempotencyKey = `${input.eventType}:${input.actorId}:${input.relatedEntityId}`;

  const event: FeeLedgerEvent = {
    eventId: crypto.randomUUID(),
    eventType: input.eventType,
    actorRole: input.actorRole,
    actorId: String(input.actorId),
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: String(input.relatedEntityId),
    baseAmount: roundTo(input.baseAmount, policy.rounding),
    feePercent,
    feeAmount,
    currency,
    status: "PENDING",
    idempotencyKey,
    auditHash: "",
    createdAt: new Date().toISOString(),
    createdByRole: input.createdByRole,
    createdById: input.createdById || null,
  };

  const auditPayload = stableStringify({
    eventType: event.eventType,
    actorRole: event.actorRole,
    actorId: event.actorId,
    relatedEntityType: event.relatedEntityType,
    relatedEntityId: event.relatedEntityId,
    baseAmount: event.baseAmount,
    feePercent: event.feePercent,
    feeAmount: event.feeAmount,
    currency: event.currency,
    status: event.status,
    idempotencyKey: event.idempotencyKey,
    createdAt: event.createdAt,
    createdByRole: event.createdByRole,
    createdById: event.createdById,
  });
  event.auditHash = sha256(auditPayload);

  const db = await getDb();
  try {
    const result = await db.collection<FeeLedgerEvent>(LEDGER_COLLECTION).insertOne(event as any);
    return { ...event, _id: result.insertedId.toString() };
  } catch (err: any) {
    if (err?.code === 11000) {
      const existing = await db
        .collection<FeeLedgerEvent>(LEDGER_COLLECTION)
        .findOne({ idempotencyKey });
      if (existing) {
        const { _id, ...rest } = existing as any;
        return { ...rest, _id: _id?.toString() };
      }
    }
    throw err;
  }
}

export async function listFeeLedgerEvents(filters: {
  actorRole?: FeeLedgerActorRole;
  actorId?: string;
  eventType?: FeeLedgerEventType;
  status?: FeeLedgerStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
} = {}) {
  await ensureIndexes();
  const db = await getDb();
  const query: Record<string, any> = {};
  if (filters.actorRole) query.actorRole = filters.actorRole;
  if (filters.actorId) query.actorId = String(filters.actorId);
  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.status) query.status = filters.status;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate).toISOString();
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate).toISOString();
  }
  const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
  const page = Math.max(filters.page || 1, 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    db.collection<FeeLedgerEvent>(LEDGER_COLLECTION).find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    db.collection<FeeLedgerEvent>(LEDGER_COLLECTION).countDocuments(query),
  ]);

  return {
    items: items.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() })),
    total,
    page,
    limit,
  };
}

export async function summarizeFeeLedgerEvents(filters: {
  actorRole?: FeeLedgerActorRole;
  eventType?: FeeLedgerEventType;
  status?: FeeLedgerStatus;
  startDate?: string;
  endDate?: string;
} = {}) {
  await ensureIndexes();
  const db = await getDb();
  const match: Record<string, any> = {};
  if (filters.actorRole) match.actorRole = filters.actorRole;
  if (filters.eventType) match.eventType = filters.eventType;
  if (filters.status) match.status = filters.status;
  if (filters.startDate || filters.endDate) {
    match.createdAt = {};
    if (filters.startDate) match.createdAt.$gte = new Date(filters.startDate).toISOString();
    if (filters.endDate) match.createdAt.$lte = new Date(filters.endDate).toISOString();
  }

  const total = await db.collection(LEDGER_COLLECTION).countDocuments(match);
  const byEventType = await db
    .collection(LEDGER_COLLECTION)
    .aggregate([{ $match: match }, { $group: { _id: "$eventType", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray();
  const byActorRole = await db
    .collection(LEDGER_COLLECTION)
    .aggregate([{ $match: match }, { $group: { _id: "$actorRole", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray();
  const byWeek = await db
    .collection(LEDGER_COLLECTION)
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $isoWeekYear: { $toDate: "$createdAt" } }, week: { $isoWeek: { $toDate: "$createdAt" } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.week": -1 } },
    ])
    .toArray();

  return {
    total,
    byEventType: byEventType.map((row) => ({ eventType: row._id, count: row.count })),
    byActorRole: byActorRole.map((row) => ({ actorRole: row._id, count: row.count })),
    byWeek: byWeek.map((row) => ({
      week: `${row._id.year}-W${String(row._id.week).padStart(2, "0")}`,
      count: row.count,
    })),
  };
}

export async function upsertServicePartnerAccountLink(input: {
  supplierId: string;
  servicePartnerId: string;
  status?: ServicePartnerAccountLinkStatus;
  createdBy: string;
}) {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date().toISOString();
  const status = input.status || "PENDING";
  const link: ServicePartnerAccountLink = {
    supplierId: String(input.supplierId),
    servicePartnerId: String(input.servicePartnerId),
    status,
    acceptedAt: status === "ACTIVE" ? now : null,
    createdAt: now,
    createdBy: input.createdBy,
  };

  await db
    .collection<ServicePartnerAccountLink>(LINK_COLLECTION)
    .updateOne(
      { supplierId: link.supplierId, servicePartnerId: link.servicePartnerId },
      { $set: link },
      { upsert: true }
    );
  return link;
}

export async function getServicePartnerAccountLink(supplierId: string, servicePartnerId: string) {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db.collection<ServicePartnerAccountLink>(LINK_COLLECTION).findOne({
    supplierId: String(supplierId),
    servicePartnerId: String(servicePartnerId),
  });
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return { ...rest, _id: _id?.toString() } as ServicePartnerAccountLink;
}

export async function listServicePartnerAccountLinksForSupplier(supplierId: string) {
  await ensureIndexes();
  const db = await getDb();
  const docs = await db
    .collection<ServicePartnerAccountLink>(LINK_COLLECTION)
    .find({ supplierId: String(supplierId) })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() }));
}

export async function setServicePartnerAccountLinkStatus(input: {
  supplierId: string;
  servicePartnerId: string;
  status: ServicePartnerAccountLinkStatus;
  acceptedAt?: string | null;
}) {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection<ServicePartnerAccountLink>(LINK_COLLECTION).updateOne(
    { supplierId: String(input.supplierId), servicePartnerId: String(input.servicePartnerId) },
    { $set: { status: input.status, acceptedAt: input.acceptedAt ?? (input.status === "ACTIVE" ? now : null) } }
  );
}
