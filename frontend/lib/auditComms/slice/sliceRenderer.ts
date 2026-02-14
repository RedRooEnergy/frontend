import crypto from "crypto";
import type {
  AuditCommsCompletenessLabel,
  CompositeEvidenceHashResult,
} from "../hash/compositeEvidenceHash";
import type { AuditCommsSliceType } from "../hash/scopeLabel";
import type {
  UnifiedEvidenceCorrelationKey,
  UnifiedEvidenceCompletenessContribution,
  UnifiedEvidenceRow,
} from "../normalize/unifiedEvidenceNormalizer";

export type SliceCorrelationRefs = {
  orderId?: string;
  shipmentId?: string;
  paymentId?: string;
  complianceCaseId?: string;
  governanceCaseId?: string;
};

export type SliceEvidenceRowBase = {
  correlationKey: UnifiedEvidenceCorrelationKey;
  channelName: "EMAIL" | "WECHAT";
  dispatchId: string;
  createdAt: string;
  payloadHash: string;
  statusProgressionHash: string | null;
  statusSummary: string;
  completenessContribution: UnifiedEvidenceCompletenessContribution;
  redactionLevel: AuditCommsSliceType;
  correlationRefs: SliceCorrelationRefs;
};

export type RegulatorSliceEvidenceRow = SliceEvidenceRowBase & {
  providerStatus?: string;
};

export type AdminSliceEvidenceRow = SliceEvidenceRowBase & {
  providerStatus?: string;
  providerErrorCodeRedacted?: string | null;
  completenessDiagnostics: {
    missingStatusProgressionHash: boolean;
    statusSummary: string;
  };
};

export type PerChannelHashSummaryRow = {
  channelName: "EMAIL" | "WECHAT";
  rowCount: number;
  payloadHashes: string[];
  statusProgressionHashes: string[];
  channelDigestHash: string;
};

export type SliceViewResponse<RowType extends RegulatorSliceEvidenceRow | AdminSliceEvidenceRow> = {
  generatedAt: string;
  cacheAge: number;
  scopeLabel: string;
  completenessLabel: AuditCommsCompletenessLabel;
  compositeEvidenceHash: string;
  channelEvidence: RowType[];
  perChannelHashSummary: PerChannelHashSummaryRow[];
  stale: boolean;
  staleThreshold: number;
};

export type RenderSliceInput = {
  sliceType: AuditCommsSliceType;
  rows: UnifiedEvidenceRow[];
  composite: CompositeEvidenceHashResult;
  generatedAt?: string;
  sourceGeneratedAt?: string;
  staleThresholdSeconds?: number;
};

const REGULATOR_SUPPRESSED_KEYS = [
  "rawBody",
  "templateContent",
  "unmaskedIdentity",
  "providerPayload",
  "secret",
  "token",
  "credential",
  "internalNote",
] as const;

const CHANNEL_ORDER: Record<"EMAIL" | "WECHAT", number> = {
  EMAIL: 0,
  WECHAT: 1,
};

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function normalizeIso(value: string): string {
  const normalized = String(value || "").trim();
  if (!normalized) return new Date().toISOString();
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return normalized;
  return new Date(parsed).toISOString();
}

function maskRef(value: string | undefined, mask: boolean): string | undefined {
  if (!value) return undefined;
  if (!mask) return value;
  const clean = String(value);
  if (clean.length <= 4) return `***${clean}`;
  return `${"*".repeat(Math.max(3, clean.length - 4))}${clean.slice(-4)}`;
}

function mapCorrelationRefs(row: UnifiedEvidenceRow, mask: boolean): SliceCorrelationRefs {
  return {
    orderId: maskRef(row.correlationRefs.orderId, mask),
    shipmentId: maskRef(row.correlationRefs.shipmentId, mask),
    paymentId: maskRef(row.correlationRefs.paymentId, mask),
    complianceCaseId: maskRef(row.correlationRefs.complianceCaseId, mask),
    governanceCaseId: maskRef(row.correlationRefs.governanceCaseId, mask),
  };
}

function toRegulatorRow(row: UnifiedEvidenceRow): RegulatorSliceEvidenceRow {
  return {
    correlationKey: {
      keyType: row.correlationKey.keyType,
      keyValue: maskRef(row.correlationKey.keyValue, true) || "",
    },
    channelName: row.channelName,
    dispatchId: row.dispatchId,
    createdAt: row.createdAt,
    payloadHash: row.payloadHash,
    statusProgressionHash: row.statusProgressionHash,
    statusSummary: row.statusSummary,
    completenessContribution: row.completenessContribution,
    redactionLevel: "REGULATOR",
    correlationRefs: mapCorrelationRefs(row, true),
    providerStatus: row.providerStatus,
  };
}

function toAdminRow(row: UnifiedEvidenceRow): AdminSliceEvidenceRow {
  return {
    correlationKey: {
      keyType: row.correlationKey.keyType,
      keyValue: row.correlationKey.keyValue,
    },
    channelName: row.channelName,
    dispatchId: row.dispatchId,
    createdAt: row.createdAt,
    payloadHash: row.payloadHash,
    statusProgressionHash: row.statusProgressionHash,
    statusSummary: row.statusSummary,
    completenessContribution: row.completenessContribution,
    redactionLevel: "ADMIN",
    correlationRefs: mapCorrelationRefs(row, false),
    providerStatus: row.providerStatus,
    providerErrorCodeRedacted: row.providerErrorCodeRedacted || null,
    completenessDiagnostics: {
      missingStatusProgressionHash: !row.statusProgressionHash,
      statusSummary: row.statusSummary,
    },
  };
}

function buildPerChannelHashSummary(rows: UnifiedEvidenceRow[]): PerChannelHashSummaryRow[] {
  const groups = new Map<"EMAIL" | "WECHAT", UnifiedEvidenceRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.channelName) || [];
    existing.push(row);
    groups.set(row.channelName, existing);
  }

  return (["EMAIL", "WECHAT"] as const)
    .filter((channelName) => groups.has(channelName))
    .map((channelName) => {
      const channelRows = (groups.get(channelName) || []).slice().sort((left, right) => {
        const byCreatedAt = left.createdAt.localeCompare(right.createdAt);
        if (byCreatedAt !== 0) return byCreatedAt;
        return left.dispatchId.localeCompare(right.dispatchId);
      });

      const payloadHashes = channelRows.map((row) => row.payloadHash);
      const statusProgressionHashes = channelRows.map((row) => row.statusProgressionHash || "");
      const digestInput = channelRows
        .map((row) => `${row.dispatchId}|${row.payloadHash}|${row.statusProgressionHash || ""}`)
        .join("\n");

      return {
        channelName,
        rowCount: channelRows.length,
        payloadHashes,
        statusProgressionHashes,
        channelDigestHash: sha256Hex(digestInput),
      };
    })
    .sort((left, right) => CHANNEL_ORDER[left.channelName] - CHANNEL_ORDER[right.channelName]);
}

function computeCacheAgeSeconds(generatedAt: string, sourceGeneratedAt?: string): number {
  const generatedTs = Date.parse(generatedAt);
  const sourceTs = sourceGeneratedAt ? Date.parse(sourceGeneratedAt) : generatedTs;

  if (Number.isNaN(generatedTs) || Number.isNaN(sourceTs)) {
    return 0;
  }

  return Math.max(0, Math.floor((generatedTs - sourceTs) / 1000));
}

export function renderAuditCommsSlice(
  input: RenderSliceInput
): SliceViewResponse<RegulatorSliceEvidenceRow> | SliceViewResponse<AdminSliceEvidenceRow> {
  const generatedAt = normalizeIso(input.generatedAt || new Date().toISOString());
  const staleThreshold = Number.isFinite(input.staleThresholdSeconds)
    ? Math.max(1, Number(input.staleThresholdSeconds))
    : 300;
  const cacheAge = computeCacheAgeSeconds(generatedAt, input.sourceGeneratedAt);

  const perChannelHashSummary = buildPerChannelHashSummary(input.rows);

  if (input.sliceType === "REGULATOR") {
    const channelEvidence = input.rows.map((row) => toRegulatorRow(row));

    return {
      generatedAt,
      cacheAge,
      scopeLabel: input.composite.scopeLabel,
      completenessLabel: input.composite.completenessLabel,
      compositeEvidenceHash: input.composite.compositeEvidenceHash,
      channelEvidence,
      perChannelHashSummary,
      stale: cacheAge > staleThreshold,
      staleThreshold,
    };
  }

  const channelEvidence = input.rows.map((row) => toAdminRow(row));

  return {
    generatedAt,
    cacheAge,
    scopeLabel: input.composite.scopeLabel,
    completenessLabel: input.composite.completenessLabel,
    compositeEvidenceHash: input.composite.compositeEvidenceHash,
    channelEvidence,
    perChannelHashSummary,
    stale: cacheAge > staleThreshold,
    staleThreshold,
  };
}

export function getRegulatorSuppressedKeyList(): readonly string[] {
  return REGULATOR_SUPPRESSED_KEYS;
}
