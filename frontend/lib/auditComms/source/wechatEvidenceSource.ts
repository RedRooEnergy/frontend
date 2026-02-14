import crypto from "crypto";
import { getDb } from "../../db/mongo";
import {
  AUDIT_COMMS_SOURCE_MAX_LIMIT,
  type AuditCommsCorrelationRefs,
  type AuditCommsEvidenceSourceQuery,
  type AuditCommsEvidenceSourceRow,
} from "./types";

type WeChatDispatchDoc = {
  dispatchId?: unknown;
  createdAt?: unknown;
  correlation?: Record<string, unknown>;
  render?: {
    renderedPayloadHashSha256?: unknown;
  };
  provider?: {
    providerStatus?: unknown;
    providerErrorCode?: unknown;
  };
};

type WeChatDispatchStatusEventDoc = {
  statusEventId?: unknown;
  dispatchId?: unknown;
  eventType?: unknown;
  providerStatus?: unknown;
  providerRequestId?: unknown;
  providerErrorCode?: unknown;
  createdAt?: unknown;
};

const WECHAT_DISPATCH_COLLECTION = "wechat_dispatch_records";
const WECHAT_STATUS_COLLECTION = "wechat_dispatch_status_events";

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
    throw new Error("AUDIT_COMMS_WECHAT_SOURCE: correlationKey.keyValue is required");
  }

  const query: Record<string, unknown> = {
    [`correlation.${input.correlationKey.keyType}`]: keyValue,
  };

  if (input.startDate || input.endDate) {
    const createdAt: Record<string, string> = {};
    if (input.startDate) createdAt.$gte = input.startDate;
    if (input.endDate) createdAt.$lte = input.endDate;
    query.createdAt = createdAt;
  }

  return query;
}

function readCorrelationRefs(correlation: Record<string, unknown> | undefined): AuditCommsCorrelationRefs {
  if (!correlation) return {};

  return {
    orderId: nonEmptyString(correlation.orderId) || undefined,
    shipmentId: nonEmptyString(correlation.shipmentId) || undefined,
    paymentId: nonEmptyString(correlation.paymentId) || undefined,
    complianceCaseId: nonEmptyString(correlation.complianceCaseId) || undefined,
    governanceCaseId: nonEmptyString(correlation.governanceCaseId) || undefined,
  };
}

function buildStatusProgressionHash(events: WeChatDispatchStatusEventDoc[]): string | null {
  if (events.length === 0) return null;

  const fragments = events
    .map((event) => {
      const createdAt = nonEmptyString(event.createdAt) || "";
      const eventType = nonEmptyString(event.eventType) || "";
      const providerStatus = nonEmptyString(event.providerStatus) || "";
      const providerRequestId = nonEmptyString(event.providerRequestId) || "";
      const providerErrorCode = nonEmptyString(event.providerErrorCode) || "";
      const statusEventId = nonEmptyString(event.statusEventId) || "";
      return `${createdAt}|${eventType}|${providerStatus}|${providerRequestId}|${providerErrorCode}|${statusEventId}`;
    })
    .sort((left, right) => left.localeCompare(right));

  return sha256Hex(fragments.join("\n"));
}

function latestStatus(events: WeChatDispatchStatusEventDoc[], fallback: string): string {
  const sorted = [...events].sort((left, right) => {
    const leftCreated = nonEmptyString(left.createdAt) || "";
    const rightCreated = nonEmptyString(right.createdAt) || "";
    if (leftCreated === rightCreated) {
      return (nonEmptyString(left.statusEventId) || "").localeCompare(nonEmptyString(right.statusEventId) || "");
    }
    return leftCreated.localeCompare(rightCreated);
  });

  const last = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  return (last && nonEmptyString(last.providerStatus)) || fallback;
}

async function listStatusEventsByDispatchIds(dispatchIds: string[]): Promise<Map<string, WeChatDispatchStatusEventDoc[]>> {
  if (dispatchIds.length === 0) return new Map<string, WeChatDispatchStatusEventDoc[]>();

  const db = await getDb();
  const rows = await db
    .collection<WeChatDispatchStatusEventDoc>(WECHAT_STATUS_COLLECTION)
    .find(
      {
        dispatchId: { $in: dispatchIds },
      },
      {
        projection: {
          _id: 0,
          statusEventId: 1,
          dispatchId: 1,
          eventType: 1,
          providerStatus: 1,
          providerRequestId: 1,
          providerErrorCode: 1,
          createdAt: 1,
        },
      }
    )
    .sort({ createdAt: 1, statusEventId: 1 })
    .toArray();

  const map = new Map<string, WeChatDispatchStatusEventDoc[]>();
  for (const row of rows) {
    const dispatchId = nonEmptyString(row.dispatchId);
    if (!dispatchId) continue;
    const existing = map.get(dispatchId) || [];
    existing.push(row);
    map.set(dispatchId, existing);
  }

  return map;
}

function toWeChatSourceRow(
  row: WeChatDispatchDoc,
  statusEvents: WeChatDispatchStatusEventDoc[]
): AuditCommsEvidenceSourceRow | null {
  const dispatchId = nonEmptyString(row.dispatchId);
  const createdAt = nonEmptyString(row.createdAt);
  if (!dispatchId || !createdAt) return null;

  const providerStatusFallback =
    nonEmptyString(row.provider?.providerStatus) ||
    "UNKNOWN";
  const providerStatus = latestStatus(statusEvents, providerStatusFallback);
  const providerErrorCode = nonEmptyString(row.provider?.providerErrorCode);

  const payloadHashRaw = nonEmptyString(row.render?.renderedPayloadHashSha256);
  const payloadHash = payloadHashRaw && isSha256Hex(payloadHashRaw)
    ? payloadHashRaw.toLowerCase()
    : sha256Hex(`${dispatchId}|${createdAt}|${providerStatus}`);

  return {
    channelName: "WECHAT",
    dispatchId,
    createdAt,
    payloadHash,
    statusProgressionHash: buildStatusProgressionHash(statusEvents),
    statusSummary: providerStatus,
    correlationRefs: readCorrelationRefs(row.correlation),
    providerStatus,
    providerErrorCodeRedacted: providerErrorCode ? "REDACTED" : null,
  };
}

export async function listWeChatEvidenceRows(
  input: AuditCommsEvidenceSourceQuery
): Promise<AuditCommsEvidenceSourceRow[]> {
  const db = await getDb();
  const query = buildQuery(input);
  const limit = clampLimit(input.limit);

  const dispatches = await db
    .collection<WeChatDispatchDoc>(WECHAT_DISPATCH_COLLECTION)
    .find(query, {
      projection: {
        _id: 0,
        dispatchId: 1,
        createdAt: 1,
        correlation: 1,
        "render.renderedPayloadHashSha256": 1,
        "provider.providerStatus": 1,
        "provider.providerErrorCode": 1,
      },
    })
    .sort({ createdAt: -1, dispatchId: 1 })
    .limit(limit)
    .toArray();

  const dispatchIds = dispatches
    .map((row) => nonEmptyString(row.dispatchId))
    .filter((value): value is string => Boolean(value));
  const statusEventsByDispatchId = await listStatusEventsByDispatchIds(dispatchIds);

  return dispatches
    .map((row) => {
      const dispatchId = nonEmptyString(row.dispatchId);
      const statusEvents = dispatchId ? statusEventsByDispatchId.get(dispatchId) || [] : [];
      return toWeChatSourceRow(row, statusEvents);
    })
    .filter((row): row is AuditCommsEvidenceSourceRow => Boolean(row));
}
