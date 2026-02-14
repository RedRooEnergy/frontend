import type { AuditCommsCompletenessLabel } from "../hash/compositeEvidenceHash";
import { computeCompositeEvidenceHash } from "../hash/compositeEvidenceHash";
import type { UnifiedEvidenceRow } from "../normalize/unifiedEvidenceNormalizer";

export type HashVerificationStatus = "MATCH" | "MISMATCH";

export type HashVerificationInput = {
  rows: UnifiedEvidenceRow[];
  scopeLabel: string;
  completenessLabel: AuditCommsCompletenessLabel;
  expectedCompositeEvidenceHash: string;
  expectedChannels?: Array<"EMAIL" | "WECHAT">;
  hasAdapterError?: boolean;
  verifiedAt?: string;
};

export type HashVerificationResult = {
  status: HashVerificationStatus;
  expectedCompositeEvidenceHash: string;
  recomputedCompositeEvidenceHash: string;
  scopeLabel: string;
  completenessLabel: AuditCommsCompletenessLabel;
  recomputedCompletenessLabel: AuditCommsCompletenessLabel;
  verifiedAt: string;
};

function normalizeString(value: unknown): string {
  return String(value || "").trim();
}

function normalizeIso(value?: string): string {
  const fallback = new Date().toISOString();
  const normalized = normalizeString(value);
  if (!normalized) return fallback;

  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return new Date(parsed).toISOString();
}

export function verifyCompositeEvidenceHash(input: HashVerificationInput): HashVerificationResult {
  const scopeLabel = normalizeString(input.scopeLabel);
  if (!scopeLabel) {
    throw new Error("AUDIT_COMMS_HASH_VERIFY: scopeLabel is required");
  }

  const expectedCompositeEvidenceHash = normalizeString(input.expectedCompositeEvidenceHash).toLowerCase();
  if (!expectedCompositeEvidenceHash) {
    throw new Error("AUDIT_COMMS_HASH_VERIFY: expectedCompositeEvidenceHash is required");
  }

  const recomputed = computeCompositeEvidenceHash({
    rows: input.rows,
    scopeLabel,
    expectedChannels: input.expectedChannels,
    hasAdapterError: input.hasAdapterError,
  });

  const recomputedCompositeEvidenceHash = recomputed.compositeEvidenceHash.toLowerCase();
  const status: HashVerificationStatus =
    recomputedCompositeEvidenceHash === expectedCompositeEvidenceHash ? "MATCH" : "MISMATCH";

  return {
    status,
    expectedCompositeEvidenceHash,
    recomputedCompositeEvidenceHash,
    scopeLabel,
    completenessLabel: input.completenessLabel,
    recomputedCompletenessLabel: recomputed.completenessLabel,
    verifiedAt: normalizeIso(input.verifiedAt),
  };
}
