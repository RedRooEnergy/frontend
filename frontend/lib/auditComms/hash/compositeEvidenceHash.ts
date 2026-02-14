import crypto from "crypto";
import type { UnifiedEvidenceRow } from "../normalize/unifiedEvidenceNormalizer";

export const MISSING_STATUS_HASH_PLACEHOLDER = "MISSING_STATUS_HASH";

export type AuditCommsCompletenessLabel = "FULL" | "PARTIAL" | "UNKNOWN";

export type CompositeEvidenceHashInput = {
  rows: UnifiedEvidenceRow[];
  scopeLabel: string;
  expectedChannels?: Array<"EMAIL" | "WECHAT">;
  hasAdapterError?: boolean;
};

export type CompositeEvidenceHashResult = {
  scopeLabel: string;
  completenessLabel: AuditCommsCompletenessLabel;
  rowFragments: string[];
  compositeInput: string;
  compositeEvidenceHash: string;
  placeholderUsed: boolean;
  missingChannels: Array<"EMAIL" | "WECHAT">;
};

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function normalizeScopeLabel(scopeLabel: string): string {
  const normalized = String(scopeLabel || "").trim();
  if (!normalized) {
    throw new Error("AUDIT_COMMS_COMPOSITE_HASH: scopeLabel is required");
  }
  return normalized;
}

function normalizeExpectedChannels(input?: Array<"EMAIL" | "WECHAT">): Array<"EMAIL" | "WECHAT"> {
  const source = input && input.length > 0 ? input : ["EMAIL", "WECHAT"];
  const set = new Set(source);
  const ordered: Array<"EMAIL" | "WECHAT"> = [];
  if (set.has("EMAIL")) ordered.push("EMAIL");
  if (set.has("WECHAT")) ordered.push("WECHAT");
  return ordered;
}

function buildRowFragments(rows: UnifiedEvidenceRow[]): {
  fragments: string[];
  placeholderUsed: boolean;
  presentChannels: Set<"EMAIL" | "WECHAT">;
} {
  let placeholderUsed = false;
  const presentChannels = new Set<"EMAIL" | "WECHAT">();

  const fragments = rows
    .map((row) => {
      presentChannels.add(row.channelName);

      const channelName = row.channelName.toLowerCase();
      const dispatchId = String(row.dispatchId || "").trim();
      const payloadHash = String(row.payloadHash || "").trim();

      const statusProgressionHash = row.statusProgressionHash
        ? String(row.statusProgressionHash).trim()
        : MISSING_STATUS_HASH_PLACEHOLDER;

      if (statusProgressionHash === MISSING_STATUS_HASH_PLACEHOLDER) {
        placeholderUsed = true;
      }

      return `${channelName}|${dispatchId}|${payloadHash}|${statusProgressionHash}`;
    })
    .sort((left, right) => left.localeCompare(right));

  return {
    fragments,
    placeholderUsed,
    presentChannels,
  };
}

function deriveCompletenessLabel(input: {
  rows: UnifiedEvidenceRow[];
  expectedChannels: Array<"EMAIL" | "WECHAT">;
  presentChannels: Set<"EMAIL" | "WECHAT">;
  placeholderUsed: boolean;
  hasAdapterError?: boolean;
}): { completenessLabel: AuditCommsCompletenessLabel; missingChannels: Array<"EMAIL" | "WECHAT"> } {
  if (input.hasAdapterError) {
    return {
      completenessLabel: "UNKNOWN",
      missingChannels: [],
    };
  }

  const missingChannels = input.expectedChannels.filter((channel) => !input.presentChannels.has(channel));

  if (input.rows.length === 0) {
    return {
      completenessLabel: "UNKNOWN",
      missingChannels,
    };
  }

  if (missingChannels.length > 0 || input.placeholderUsed) {
    return {
      completenessLabel: "PARTIAL",
      missingChannels,
    };
  }

  return {
    completenessLabel: "FULL",
    missingChannels,
  };
}

export function computeCompositeEvidenceHash(input: CompositeEvidenceHashInput): CompositeEvidenceHashResult {
  const scopeLabel = normalizeScopeLabel(input.scopeLabel);
  const expectedChannels = normalizeExpectedChannels(input.expectedChannels);

  const { fragments, placeholderUsed, presentChannels } = buildRowFragments(input.rows);
  const { completenessLabel, missingChannels } = deriveCompletenessLabel({
    rows: input.rows,
    expectedChannels,
    presentChannels,
    placeholderUsed,
    hasAdapterError: input.hasAdapterError,
  });

  const compositeInput = `${scopeLabel}||${fragments.join("\n")}`;
  const compositeEvidenceHash = sha256Hex(compositeInput);

  return {
    scopeLabel,
    completenessLabel,
    rowFragments: fragments,
    compositeInput,
    compositeEvidenceHash,
    placeholderUsed,
    missingChannels,
  };
}
