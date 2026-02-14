import fs from "node:fs/promises";
import path from "node:path";
import { getOrders } from "../store";
import { computeChainRoot, recomputeExportManifestHash, recomputeFreightSettlementHash } from "./chainComputation";
import { getLatestExportManifestRecordByOrderId, type ExportManifestRecord } from "./exportManifestStore";
import { getLatestFinalFreightSettlementRecordByOrderId, type FreightSettlementRecord } from "./freightSettlementStore";
import { assertSha256LowerHex64, isSha256LowerHex64 } from "./hashValidation";

type PaymentSnapshotRecord = {
  orderId: string;
  pricingSnapshotHash?: string | null;
};

export type IntegrityFailureClass =
  | "SNAPSHOT_MISMATCH"
  | "MANIFEST_MISMATCH"
  | "SETTLEMENT_MISMATCH"
  | "CHAIN_ROOT_INVALID"
  | "MISSING_REFERENCE";

export type IntegrityVerificationResult = {
  orderId: string;
  status: "PASS" | "FAIL";
  failureClass: IntegrityFailureClass | null;
  hashes: {
    paymentSnapshotHash: string | null;
    exportManifestHash: string | null;
    freightSettlementHash: string | null;
    chainRootSha256: string | null;
  };
  evidence: {
    paymentSnapshot: {
      pricingVersion: string | null;
      sourceRecordId: string;
      hashField: "pricingSnapshotHash";
    };
    exportManifest: {
      sourceRecordId: string;
      manifestPath: string | null;
      recomputedManifestHash: string | null;
      storedManifestHash: string | null;
      recomputeSource: "manifest_file" | "stored_hash_fallback";
    };
    freightSettlement: {
      sourceRecordId: string;
      settlementVersion: string | null;
      storedSettlementHash: string | null;
      recomputedSettlementHash: string | null;
    };
  };
  computedAt: string;
};

export type VerifyIntegrityChainDependencies = {
  getOrderById: (orderId: string) => Promise<PaymentSnapshotRecord | null> | PaymentSnapshotRecord | null;
  getExportManifestByOrderId: (orderId: string) => Promise<ExportManifestRecord | null> | ExportManifestRecord | null;
  getFinalFreightSettlementByOrderId: (orderId: string) => Promise<FreightSettlementRecord | null> | FreightSettlementRecord | null;
  readManifestFileUtf8: (manifestPath: string) => Promise<string | null>;
  now: () => Date;
};

function resolveManifestPathCandidates(manifestPath: string) {
  if (path.isAbsolute(manifestPath)) {
    return [manifestPath];
  }

  return [
    path.resolve(process.cwd(), manifestPath),
    path.resolve(process.cwd(), "frontend", manifestPath),
  ];
}

const defaultDependencies: VerifyIntegrityChainDependencies = {
  getOrderById: (orderId) => {
    const normalizedOrderId = String(orderId || "").trim();
    if (!normalizedOrderId) return null;
    const order = getOrders().find((entry) => entry.orderId === normalizedOrderId);
    if (!order) return null;
    return {
      orderId: order.orderId,
      pricingSnapshotHash: String(order.pricingSnapshotHash || "").trim() || null,
    };
  },
  getExportManifestByOrderId: (orderId) => getLatestExportManifestRecordByOrderId(orderId),
  getFinalFreightSettlementByOrderId: (orderId) => getLatestFinalFreightSettlementRecordByOrderId(orderId),
  readManifestFileUtf8: async (manifestPath) => {
    const normalized = String(manifestPath || "").trim();
    if (!normalized) return null;

    for (const candidate of resolveManifestPathCandidates(normalized)) {
      try {
        return await fs.readFile(candidate, "utf8");
      } catch {
        // try next candidate
      }
    }

    return null;
  },
  now: () => new Date(),
};

function resolveDependencies(
  overrides: Partial<VerifyIntegrityChainDependencies> = {}
): VerifyIntegrityChainDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function baseResult(orderId: string, computedAt: string): IntegrityVerificationResult {
  return {
    orderId,
    status: "FAIL",
    failureClass: "MISSING_REFERENCE",
    hashes: {
      paymentSnapshotHash: null,
      exportManifestHash: null,
      freightSettlementHash: null,
      chainRootSha256: null,
    },
    evidence: {
      paymentSnapshot: {
        pricingVersion: null,
        sourceRecordId: "",
        hashField: "pricingSnapshotHash",
      },
      exportManifest: {
        sourceRecordId: "",
        manifestPath: null,
        recomputedManifestHash: null,
        storedManifestHash: null,
        recomputeSource: "stored_hash_fallback",
      },
      freightSettlement: {
        sourceRecordId: "",
        settlementVersion: null,
        storedSettlementHash: null,
        recomputedSettlementHash: null,
      },
    },
    computedAt,
  };
}

export async function verifyIntegrityChain(
  orderId: string,
  input: {
    declaredChainRootSha256?: string | null;
  } = {},
  dependencyOverrides: Partial<VerifyIntegrityChainDependencies> = {}
): Promise<IntegrityVerificationResult> {
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) {
    throw new Error("CHAIN_INTEGRITY_ORDER_ID_REQUIRED");
  }

  const deps = resolveDependencies(dependencyOverrides);
  const computedAt = deps.now().toISOString();
  const result = baseResult(normalizedOrderId, computedAt);

  const [snapshot, manifest, settlement] = await Promise.all([
    deps.getOrderById(normalizedOrderId),
    deps.getExportManifestByOrderId(normalizedOrderId),
    deps.getFinalFreightSettlementByOrderId(normalizedOrderId),
  ]);

  if (!snapshot || !manifest || !settlement) {
    return result;
  }

  const paymentSnapshotHash = String(snapshot.pricingSnapshotHash || "").trim();
  const manifestPaymentSnapshotHash = String(manifest.paymentSnapshotHash || "").trim();
  const settlementPaymentSnapshotHash = String(settlement.paymentSnapshotHash || "").trim();
  const storedManifestHash = String(manifest.exportManifestHash || "").trim();
  const settlementManifestHash = String(settlement.exportManifestHash || "").trim();
  const storedSettlementHash = String(settlement.freightSettlementHash || "").trim();

  if (
    !isSha256LowerHex64(paymentSnapshotHash) ||
    !isSha256LowerHex64(manifestPaymentSnapshotHash) ||
    !isSha256LowerHex64(settlementPaymentSnapshotHash) ||
    !isSha256LowerHex64(storedManifestHash) ||
    !isSha256LowerHex64(settlementManifestHash) ||
    !isSha256LowerHex64(storedSettlementHash)
  ) {
    return result;
  }

  result.hashes.paymentSnapshotHash = paymentSnapshotHash;
  result.hashes.exportManifestHash = storedManifestHash;
  result.hashes.freightSettlementHash = storedSettlementHash;
  result.evidence.paymentSnapshot.sourceRecordId = snapshot.orderId;
  result.evidence.exportManifest.sourceRecordId = String(manifest.recordId || manifest._id || "").trim() || manifest.orderId;
  result.evidence.exportManifest.manifestPath = String(manifest.manifestPath || "").trim() || null;
  result.evidence.exportManifest.storedManifestHash = storedManifestHash;
  result.evidence.freightSettlement.sourceRecordId =
    String(settlement.settlementRecordId || settlement._id || "").trim() || settlement.orderId;
  result.evidence.freightSettlement.settlementVersion = String(settlement.settlementVersion || "").trim() || null;
  result.evidence.freightSettlement.storedSettlementHash = storedSettlementHash;

  if (manifestPaymentSnapshotHash !== paymentSnapshotHash || settlementPaymentSnapshotHash !== paymentSnapshotHash) {
    result.failureClass = "SNAPSHOT_MISMATCH";
    return result;
  }

  let recomputedManifestHash = storedManifestHash;
  const manifestPath = String(manifest.manifestPath || "").trim();
  if (manifestPath) {
    const manifestText = await deps.readManifestFileUtf8(manifestPath);
    if (manifestText) {
      recomputedManifestHash = recomputeExportManifestHash(manifestText);
      result.evidence.exportManifest.recomputeSource = "manifest_file";
    }
  }

  result.evidence.exportManifest.recomputedManifestHash = recomputedManifestHash;

  if (recomputedManifestHash !== storedManifestHash || settlementManifestHash !== storedManifestHash) {
    result.failureClass = "MANIFEST_MISMATCH";
    return result;
  }

  const settlementPayloadCanonicalJson = String(settlement.settlementPayloadCanonicalJson || "").trim();
  if (!settlementPayloadCanonicalJson) {
    result.failureClass = "MISSING_REFERENCE";
    return result;
  }

  const recomputedSettlementHash = recomputeFreightSettlementHash(settlementPayloadCanonicalJson);
  result.evidence.freightSettlement.recomputedSettlementHash = recomputedSettlementHash;

  if (recomputedSettlementHash !== storedSettlementHash) {
    result.failureClass = "SETTLEMENT_MISMATCH";
    return result;
  }

  const chainRootSha256 = computeChainRoot({
    paymentSnapshotHash,
    exportManifestHash: storedManifestHash,
    freightSettlementHash: storedSettlementHash,
  });
  result.hashes.chainRootSha256 = chainRootSha256;

  const declaredChainRootSha256 = String(input.declaredChainRootSha256 || "").trim();
  if (declaredChainRootSha256) {
    const normalizedDeclared = assertSha256LowerHex64(declaredChainRootSha256, "declaredChainRootSha256");
    if (normalizedDeclared !== chainRootSha256) {
      result.failureClass = "CHAIN_ROOT_INVALID";
      return result;
    }
  }

  result.status = "PASS";
  result.failureClass = null;
  return result;
}
