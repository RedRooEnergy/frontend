import crypto from "crypto";
import { getDb } from "../../db/mongo";
import {
  AUDIT_COMMS_SOURCE_MAX_LIMIT,
  type AuditCommsCorrelationRefs,
  type AuditCommsEvidenceSourceQuery,
  type AuditCommsEvidenceSourceRow,
} from "./types";

type EmailDispatchDoc = {
  dispatchId?: unknown;
  createdAt?: unknown;
  renderedHash?: unknown;
  sendStatus?: unknown;
  error?: unknown;
  providerMessageId?: unknown;
  entityRefs?: Record<string, unknown>;
};

const EMAIL_DISPATCH_COLLECTION = "email_dispatches";

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function isSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

function nonEmptyString(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function clampLimit(limit?: number): number {
  const value = Number.isFinite(limit) ? Number(limit) : 100;
  return Math.max(1, Math.min(value, AUDIT_COMMS_SOURCE_MAX_LIMIT));
}

function buildQuery(input: AuditCommsEvidenceSourceQuery): Record<string, unknown> {
  const keyValue = nonEmptyString(input.correlationKey.keyValue);
  if (!keyValue) {
    throw new Error("AUDIT_COMMS_EMAIL_SOURCE: correlationKey.keyValue is required");
  }

  const query: Record<string, unknown> = {
    [`entityRefs.${input.correlationKey.keyType}`]: keyValue,
  };

  if (input.startDate || input.endDate) {
    const createdAt: Record<string, string> = {};
    if (input.startDate) createdAt.$gte = input.startDate;
    if (input.endDate) createdAt.$lte = input.endDate;
    query.createdAt = createdAt;
  }

  return query;
}

function readCorrelationRefs(entityRefs: Record<string, unknown> | undefined): AuditCommsCorrelationRefs {
  if (!entityRefs) return {};

  return {
    orderId: nonEmptyString(entityRefs.orderId) || undefined,
    shipmentId: nonEmptyString(entityRefs.shipmentId) || undefined,
    paymentId: nonEmptyString(entityRefs.paymentId) || undefined,
    complianceCaseId: nonEmptyString(entityRefs.complianceCaseId) || undefined,
    governanceCaseId: nonEmptyString(entityRefs.governanceCaseId) || undefined,
  };
}

function toEmailSourceRow(row: EmailDispatchDoc): AuditCommsEvidenceSourceRow | null {
  const dispatchId = nonEmptyString(row.dispatchId);
  const createdAt = nonEmptyString(row.createdAt);
  if (!dispatchId || !createdAt) return null;

  const renderedHash = nonEmptyString(row.renderedHash);
  const sendStatus = nonEmptyString(row.sendStatus) || "UNKNOWN";
  const providerMessageId = nonEmptyString(row.providerMessageId) || "";
  const error = nonEmptyString(row.error) || "";

  const payloadHash = renderedHash && isSha256Hex(renderedHash)
    ? renderedHash.toLowerCase()
    : sha256Hex(`${dispatchId}|${createdAt}|${sendStatus}`);

  const statusProgressionHash = sha256Hex(`${sendStatus}|${providerMessageId}|${error}`);

  return {
    channelName: "EMAIL",
    dispatchId,
    createdAt,
    payloadHash,
    statusProgressionHash,
    statusSummary: sendStatus,
    correlationRefs: readCorrelationRefs(row.entityRefs),
    providerStatus: sendStatus,
    providerErrorCodeRedacted: error ? "REDACTED" : null,
  };
}

export async function listEmailEvidenceRows(
  input: AuditCommsEvidenceSourceQuery
): Promise<AuditCommsEvidenceSourceRow[]> {
  const db = await getDb();
  const query = buildQuery(input);
  const limit = clampLimit(input.limit);

  const rows = await db
    .collection<EmailDispatchDoc>(EMAIL_DISPATCH_COLLECTION)
    .find(query, {
      projection: {
        _id: 0,
        dispatchId: 1,
        createdAt: 1,
        renderedHash: 1,
        sendStatus: 1,
        error: 1,
        providerMessageId: 1,
        entityRefs: 1,
      },
    })
    .sort({ createdAt: -1, dispatchId: 1 })
    .limit(limit)
    .toArray();

  return rows
    .map((row) => toEmailSourceRow(row))
    .filter((row): row is AuditCommsEvidenceSourceRow => Boolean(row));
}
