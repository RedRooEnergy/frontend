import type {
  AuditCommsCorrelationKeyType,
  AuditCommsEvidenceSourceRow,
} from "../source/types";

export type UnifiedEvidenceRedactionLevel = "ADMIN" | "REGULATOR";

export type UnifiedEvidenceCompletenessContribution = "FULL" | "PARTIAL" | "UNKNOWN";

export type UnifiedEvidenceCorrelationKey = {
  keyType: AuditCommsCorrelationKeyType;
  keyValue: string;
};

export type UnifiedEvidenceRow = {
  correlationKey: UnifiedEvidenceCorrelationKey;
  channelName: "EMAIL" | "WECHAT";
  dispatchId: string;
  createdAt: string;
  payloadHash: string;
  statusProgressionHash: string | null;
  statusSummary: string;
  completenessContribution: UnifiedEvidenceCompletenessContribution;
  redactionLevel: UnifiedEvidenceRedactionLevel;
  correlationRefs: {
    orderId?: string;
    shipmentId?: string;
    paymentId?: string;
    complianceCaseId?: string;
    governanceCaseId?: string;
  };
  providerStatus?: string;
  providerErrorCodeRedacted?: string | null;
};

const CHANNEL_ORDER: Record<UnifiedEvidenceRow["channelName"], number> = {
  EMAIL: 0,
  WECHAT: 1,
};

function normalizeCorrelationKey(input: UnifiedEvidenceCorrelationKey): UnifiedEvidenceCorrelationKey {
  const keyValue = String(input.keyValue || "").trim();
  if (!keyValue) {
    throw new Error("AUDIT_COMMS_NORMALIZER: correlationKey.keyValue is required");
  }

  return {
    keyType: input.keyType,
    keyValue,
  };
}

function normalizeIsoTimestamp(value: string): string {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return normalized;
  }

  return new Date(parsed).toISOString();
}

function deriveCompletenessContribution(row: AuditCommsEvidenceSourceRow): UnifiedEvidenceCompletenessContribution {
  if (!row.statusProgressionHash) return "PARTIAL";
  return "FULL";
}

function compareUnifiedEvidenceRows(left: UnifiedEvidenceRow, right: UnifiedEvidenceRow): number {
  const leftCorrelation = `${left.correlationKey.keyType}:${left.correlationKey.keyValue}`;
  const rightCorrelation = `${right.correlationKey.keyType}:${right.correlationKey.keyValue}`;
  if (leftCorrelation !== rightCorrelation) {
    return leftCorrelation.localeCompare(rightCorrelation);
  }

  const channelOrderDelta = CHANNEL_ORDER[left.channelName] - CHANNEL_ORDER[right.channelName];
  if (channelOrderDelta !== 0) return channelOrderDelta;

  const createdAtDelta = left.createdAt.localeCompare(right.createdAt);
  if (createdAtDelta !== 0) return createdAtDelta;

  return left.dispatchId.localeCompare(right.dispatchId);
}

export function normalizeUnifiedEvidenceRows(input: {
  correlationKey: UnifiedEvidenceCorrelationKey;
  rows: AuditCommsEvidenceSourceRow[];
  redactionLevel?: UnifiedEvidenceRedactionLevel;
}): UnifiedEvidenceRow[] {
  const correlationKey = normalizeCorrelationKey(input.correlationKey);
  const redactionLevel = input.redactionLevel || "ADMIN";

  const normalizedRows = input.rows.map((row) => {
    const dispatchId = String(row.dispatchId || "").trim();
    if (!dispatchId) {
      throw new Error("AUDIT_COMMS_NORMALIZER: dispatchId is required");
    }

    const createdAt = normalizeIsoTimestamp(String(row.createdAt || ""));

    return {
      correlationKey,
      channelName: row.channelName,
      dispatchId,
      createdAt,
      payloadHash: String(row.payloadHash || "").trim(),
      statusProgressionHash: row.statusProgressionHash || null,
      statusSummary: String(row.statusSummary || "UNKNOWN").trim() || "UNKNOWN",
      completenessContribution: deriveCompletenessContribution(row),
      redactionLevel,
      correlationRefs: {
        orderId: row.correlationRefs.orderId,
        shipmentId: row.correlationRefs.shipmentId,
        paymentId: row.correlationRefs.paymentId,
        complianceCaseId: row.correlationRefs.complianceCaseId,
        governanceCaseId: row.correlationRefs.governanceCaseId,
      },
      providerStatus: row.providerStatus,
      providerErrorCodeRedacted: row.providerErrorCodeRedacted,
    } satisfies UnifiedEvidenceRow;
  });

  return normalizedRows.sort(compareUnifiedEvidenceRows);
}

export function deterministicUnifiedEvidenceOrderSignature(rows: UnifiedEvidenceRow[]): string {
  return rows
    .map(
      (row) =>
        `${row.correlationKey.keyType}:${row.correlationKey.keyValue}|${row.channelName}|${row.createdAt}|${row.dispatchId}`
    )
    .join("\n");
}
