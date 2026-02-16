import crypto from "crypto";
import { getDb } from "../db/mongo";
import { EmailEventCode, EmailRecipientRole } from "./events";

export type EmailTemplateStatus = "DRAFT" | "APPROVED" | "LOCKED" | "RETIRED";

export type EmailTemplate = {
  _id?: string;
  templateId: string;
  eventCode: EmailEventCode;
  roleScope: EmailRecipientRole;
  language: "EN" | "ZH_CN";
  subjectTemplate: string;
  bodyTemplateHtml: string;
  bodyTemplateText: string;
  allowedVariables: string[];
  version: number;
  status: EmailTemplateStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type EmailDispatchStatus = "QUEUED" | "SENT" | "FAILED";

export type EmailDispatch = {
  _id?: string;
  dispatchId: string;
  eventCode: EmailEventCode;
  templateId: string;
  templateVersion: number;
  recipientUserId: string;
  recipientRole: EmailRecipientRole;
  recipientEmail: string;
  entityRefs: Record<string, string>;
  renderedHash: string;
  providerMessageId?: string | null;
  sendStatus: EmailDispatchStatus;
  error?: string | null;
  idempotencyKey: string;
  createdAt: string;
};

export type EmailEventPolicy = {
  _id?: string;
  eventCode: EmailEventCode | "__ALL__";
  isDisabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

const TEMPLATE_COLLECTION = "email_templates";
const DISPATCH_COLLECTION = "email_dispatches";
const POLICY_COLLECTION = "email_event_policies";

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      await db.collection(TEMPLATE_COLLECTION).createIndex({ templateId: 1, version: 1 }, { unique: true, name: "template_version_unique" });
      await db.collection(TEMPLATE_COLLECTION).createIndex({ eventCode: 1, roleScope: 1, language: 1 }, { name: "event_role_lang" });
      await db.collection(TEMPLATE_COLLECTION).createIndex({ status: 1, updatedAt: -1 }, { name: "template_status_updatedAt" });

      await db.collection(DISPATCH_COLLECTION).createIndex({ dispatchId: 1 }, { unique: true, name: "dispatch_id_unique" });
      await db.collection(DISPATCH_COLLECTION).createIndex({ idempotencyKey: 1 }, { unique: true, name: "dispatch_idempotency_unique" });
      await db.collection(DISPATCH_COLLECTION).createIndex({ recipientUserId: 1, createdAt: -1 }, { name: "dispatch_recipient_createdAt" });
      await db.collection(DISPATCH_COLLECTION).createIndex({ eventCode: 1, createdAt: -1 }, { name: "dispatch_event_createdAt" });
      await db.collection(DISPATCH_COLLECTION).createIndex({ sendStatus: 1, createdAt: -1 }, { name: "dispatch_status_createdAt" });

      await db.collection(POLICY_COLLECTION).createIndex({ eventCode: 1 }, { unique: true, name: "event_policy_unique" });
    })();
  }
  await indexesReady;
}

export async function listEmailTemplates() {
  await ensureIndexes();
  const db = await getDb();
  const docs = await db.collection<EmailTemplate>(TEMPLATE_COLLECTION).find({}).sort({ eventCode: 1, version: -1 }).toArray();
  return docs.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() }));
}

export async function getEmailTemplate(templateId: string, version?: number) {
  await ensureIndexes();
  const db = await getDb();
  const query: Record<string, any> = { templateId };
  if (version) query.version = version;
  const doc = await db.collection<EmailTemplate>(TEMPLATE_COLLECTION).findOne(query);
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return { ...rest, _id: _id?.toString() } as EmailTemplate;
}

export async function getLatestTemplateForEvent(eventCode: EmailEventCode, roleScope: EmailRecipientRole, language: "EN" | "ZH_CN") {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db
    .collection<EmailTemplate>(TEMPLATE_COLLECTION)
    .find({ eventCode, roleScope, language })
    .sort({ version: -1 })
    .limit(1)
    .next();
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return { ...rest, _id: _id?.toString() } as EmailTemplate;
}

export async function insertEmailTemplate(template: EmailTemplate) {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date().toISOString();
  const payload = { ...template, createdAt: now, updatedAt: now };

  const existing = await db.collection<EmailTemplate>(TEMPLATE_COLLECTION).findOne({
    templateId: template.templateId,
    version: template.version,
  });
  if (existing) return { ...existing, _id: existing._id?.toString() };

  await db.collection<EmailTemplate>(TEMPLATE_COLLECTION).insertOne(payload as any);
  return payload;
}

export async function getDispatchByIdempotencyKey(idempotencyKey: string) {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db.collection<EmailDispatch>(DISPATCH_COLLECTION).findOne({ idempotencyKey });
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return { ...rest, _id: _id?.toString() } as EmailDispatch;
}

export async function recordEmailDispatch(dispatch: EmailDispatch) {
  await ensureIndexes();
  const db = await getDb();
  try {
    const result = await db.collection<EmailDispatch>(DISPATCH_COLLECTION).insertOne(dispatch as any);
    return { ...dispatch, _id: result.insertedId.toString() };
  } catch (err: any) {
    if (err?.code === 11000) {
      const existing = await db.collection<EmailDispatch>(DISPATCH_COLLECTION).findOne({ idempotencyKey: dispatch.idempotencyKey });
      if (existing) {
        const { _id, ...rest } = existing as any;
        return { ...rest, _id: _id?.toString() } as EmailDispatch;
      }
    }
    throw err;
  }
}

export async function listEmailDispatches(filters: {
  recipientUserId?: string;
  recipientRole?: EmailRecipientRole;
  eventCode?: EmailEventCode;
  sendStatus?: EmailDispatchStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
} = {}) {
  await ensureIndexes();
  const db = await getDb();
  const query: Record<string, any> = {};
  if (filters.recipientUserId) query.recipientUserId = filters.recipientUserId;
  if (filters.recipientRole) query.recipientRole = filters.recipientRole;
  if (filters.eventCode) query.eventCode = filters.eventCode;
  if (filters.sendStatus) query.sendStatus = filters.sendStatus;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = filters.startDate;
    if (filters.endDate) query.createdAt.$lte = filters.endDate;
  }

  const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
  const page = Math.max(filters.page || 1, 1);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    db.collection<EmailDispatch>(DISPATCH_COLLECTION).find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    db.collection<EmailDispatch>(DISPATCH_COLLECTION).countDocuments(query),
  ]);

  return {
    items: items.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() })),
    total,
    page,
    limit,
  };
}

export async function listEmailEventPolicies() {
  await ensureIndexes();
  const db = await getDb();
  const docs = await db.collection<EmailEventPolicy>(POLICY_COLLECTION).find({}).sort({ eventCode: 1 }).toArray();
  return docs.map(({ _id, ...rest }) => ({ ...rest, _id: _id?.toString() }));
}

export async function setEmailEventPolicy(input: {
  eventCode: EmailEventCode | "__ALL__";
  isDisabled: boolean;
  updatedBy?: string;
}) {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection<EmailEventPolicy>(POLICY_COLLECTION).updateOne(
    { eventCode: input.eventCode },
    {
      $set: {
        eventCode: input.eventCode,
        isDisabled: input.isDisabled,
        updatedAt: now,
        updatedBy: input.updatedBy || "system",
      },
    },
    { upsert: true }
  );
  const doc = await db.collection<EmailEventPolicy>(POLICY_COLLECTION).findOne({ eventCode: input.eventCode });
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return { ...rest, _id: _id?.toString() } as EmailEventPolicy;
}

export async function isEmailEventBlocked(eventCode: EmailEventCode) {
  await ensureIndexes();
  const db = await getDb();
  const global = await db.collection<EmailEventPolicy>(POLICY_COLLECTION).findOne({ eventCode: "__ALL__", isDisabled: true });
  if (global) return true;
  const doc = await db.collection<EmailEventPolicy>(POLICY_COLLECTION).findOne({ eventCode, isDisabled: true });
  return !!doc;
}

export function hashDispatchContent(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}
