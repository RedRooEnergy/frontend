import type { AuditCommsCorrelationKeyType } from "../source/types";

export type AuditCommsSliceType = "ADMIN" | "REGULATOR";

export type ScopeLabelFilters = {
  timeRange?: {
    start?: string;
    end?: string;
  };
  channels?: Array<"EMAIL" | "WECHAT">;
  statuses?: string[];
};

export type ScopeLabelInput = {
  correlationKey: {
    keyType: AuditCommsCorrelationKeyType;
    keyValue: string;
  };
  sliceType: AuditCommsSliceType;
  filters?: ScopeLabelFilters;
};

function normalizeString(value: unknown): string {
  return String(value || "").trim();
}

function normalizeIsoOrRaw(value: unknown): string {
  const normalized = normalizeString(value);
  if (!normalized) return "";
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return normalized;
  return new Date(parsed).toISOString();
}

function normalizeStatuses(values: string[] | undefined): string[] {
  return [...new Set((values || []).map((value) => normalizeString(value).toUpperCase()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function normalizeChannels(values: Array<"EMAIL" | "WECHAT"> | undefined): Array<"EMAIL" | "WECHAT"> {
  const set = new Set(values || []);
  const ordered: Array<"EMAIL" | "WECHAT"> = [];
  if (set.has("EMAIL")) ordered.push("EMAIL");
  if (set.has("WECHAT")) ordered.push("WECHAT");
  return ordered;
}

export function buildDeterministicScopeLabel(input: ScopeLabelInput): string {
  const keyType = input.correlationKey.keyType;
  const keyValue = normalizeString(input.correlationKey.keyValue);
  if (!keyValue) {
    throw new Error("AUDIT_COMMS_SCOPE_LABEL: correlationKey.keyValue is required");
  }

  const channels = normalizeChannels(input.filters?.channels);
  const statuses = normalizeStatuses(input.filters?.statuses);
  const timeStart = normalizeIsoOrRaw(input.filters?.timeRange?.start);
  const timeEnd = normalizeIsoOrRaw(input.filters?.timeRange?.end);

  return [
    `correlation=${keyType}:${keyValue}`,
    `slice=${input.sliceType}`,
    `time.start=${timeStart || "*"}`,
    `time.end=${timeEnd || "*"}`,
    `channels=${channels.length > 0 ? channels.join(",") : "*"}`,
    `statuses=${statuses.length > 0 ? statuses.join(",") : "*"}`,
  ].join(";");
}
