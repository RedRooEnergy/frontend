import assert from "node:assert/strict";
import { canonicalizeSettlementPayload } from "../../lib/chainIntegrity/canonicalSettlement";
import { computeChainRoot, recomputeFreightSettlementHash } from "../../lib/chainIntegrity/chainComputation";
import { verifyIntegrityChain } from "../../lib/chainIntegrity/verifyIntegrityChain";

type TestResult = {
  id: string;
  pass: boolean;
  details: string;
};

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const HASH_D = "d".repeat(64);

function buildCanonicalPayload(overrides: Partial<Parameters<typeof canonicalizeSettlementPayload>[0]> = {}) {
  return {
    schemaVersion: "FREIGHT_SETTLEMENT_CANONICAL_V1" as const,
    orderId: "ORD-900",
    paymentSnapshotHash: HASH_A,
    exportManifestHash: HASH_B,
    currency: "AUD" as const,
    subtotalAUD: 100,
    shippingAUD: 20,
    insuranceAUD: 5,
    dutyAUD: 10,
    gstAUD: 13,
    totalAUD: 148,
    incoterm: "DDP" as const,
    carrierId: "CARRIER-1",
    shipmentId: "SHIP-1",
    trackingNumbers: ["T-02", "T-01"],
    lane: {
      originCountry: "CN",
      destinationCountry: "AU",
      originPort: "SHA",
      destinationPort: "SYD",
    },
    compliance: {
      certificateIssued: true,
      certificateHash: HASH_C,
      certificateId: "CERT-1",
    },
    settlementStatus: "FINAL" as const,
    finalizedAt: "2026-02-14T00:00:00.000Z",
    ...overrides,
  };
}

async function runCheck(id: string, fn: () => void | Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { id, pass: true, details: "PASS" };
  } catch (error: any) {
    return { id, pass: false, details: String(error?.message || error) };
  }
}

async function runVerificationCase(input: {
  orderId?: string;
  snapshotHash?: string;
  manifestPaymentSnapshotHash?: string;
  manifestHash?: string;
  settlementPaymentSnapshotHash?: string;
  settlementManifestHash?: string;
  settlementHash?: string;
  canonicalJson?: string;
  declaredChainRootSha256?: string | null;
  includeSnapshot?: boolean;
  includeManifest?: boolean;
  includeSettlement?: boolean;
}) {
  const orderId = input.orderId || "ORD-900";
  const snapshotHash = input.snapshotHash || HASH_A;
  const manifestHash = input.manifestHash || HASH_B;
  const settlementHash = input.settlementHash || HASH_C;

  const result = await verifyIntegrityChain(
    orderId,
    {
      declaredChainRootSha256: input.declaredChainRootSha256,
    },
    {
      getOrderById: async (requestedOrderId) => {
        if (input.includeSnapshot === false) return null;
        return {
          orderId: requestedOrderId,
          pricingSnapshotHash: snapshotHash,
        };
      },
      getExportManifestByOrderId: async (requestedOrderId) => {
        if (input.includeManifest === false) return null;
        return {
          recordId: "manifest-rec-1",
          orderId: requestedOrderId,
          paymentSnapshotHash: input.manifestPaymentSnapshotHash || snapshotHash,
          exportManifestHash: manifestHash,
          manifestPath: null,
          createdAt: "2026-02-14T00:00:00.000Z",
          updatedAt: "2026-02-14T00:00:00.000Z",
        };
      },
      getFinalFreightSettlementByOrderId: async (requestedOrderId) => {
        if (input.includeSettlement === false) return null;
        return {
          settlementRecordId: "settlement-rec-1",
          orderId: requestedOrderId,
          status: "FINAL",
          settlementVersion: "v1",
          paymentSnapshotHash: input.settlementPaymentSnapshotHash || snapshotHash,
          exportManifestHash: input.settlementManifestHash || manifestHash,
          freightSettlementHash: settlementHash,
          settlementPayloadCanonicalJson: input.canonicalJson || "canonical-json-v1",
          createdAt: "2026-02-14T00:00:00.000Z",
          updatedAt: "2026-02-14T00:00:00.000Z",
        };
      },
      readManifestFileUtf8: async () => null,
      now: () => new Date("2026-02-14T00:00:00.000Z"),
    }
  );

  return result;
}

async function main() {
  const results: TestResult[] = [];

  results.push(
    await runCheck("CANONICAL_SERIALIZATION_STABILITY", () => {
      const payloadA = buildCanonicalPayload({
        trackingNumbers: ["T-02", "T-01"],
        lane: {
          destinationCountry: "AU",
          destinationPort: "SYD",
          originCountry: "CN",
          originPort: "SHA",
        },
      });
      const payloadB = buildCanonicalPayload({
        trackingNumbers: ["T-01", "T-02"],
        lane: {
          originPort: "SHA",
          originCountry: "CN",
          destinationPort: "SYD",
          destinationCountry: "AU",
        },
      });

      const canonicalA = canonicalizeSettlementPayload(payloadA);
      const canonicalB = canonicalizeSettlementPayload(payloadB);

      assert.equal(canonicalA, canonicalB, "Canonical settlement serialization is not deterministic");
      assert(!canonicalA.endsWith("\n"), "Canonical payload must not include trailing newline");
    })
  );

  results.push(
    await runCheck("PASS_BASELINE", async () => {
      const canonicalJson = canonicalizeSettlementPayload(buildCanonicalPayload());
      const settlementHash = recomputeFreightSettlementHash(canonicalJson);
      const manifestHash = HASH_B;
      const chainRoot = computeChainRoot({
        paymentSnapshotHash: HASH_A,
        exportManifestHash: manifestHash,
        freightSettlementHash: settlementHash,
      });

      const result = await runVerificationCase({
        canonicalJson,
        settlementHash,
        manifestHash,
        declaredChainRootSha256: chainRoot,
      });

      assert.equal(result.status, "PASS");
      assert.equal(result.failureClass, null);
      assert.equal(result.hashes.chainRootSha256, chainRoot);
    })
  );

  results.push(
    await runCheck("SNAPSHOT_MISMATCH", async () => {
      const result = await runVerificationCase({
        manifestPaymentSnapshotHash: HASH_D,
      });

      assert.equal(result.status, "FAIL");
      assert.equal(result.failureClass, "SNAPSHOT_MISMATCH");
    })
  );

  results.push(
    await runCheck("MANIFEST_MISMATCH", async () => {
      const result = await runVerificationCase({
        settlementManifestHash: HASH_D,
      });

      assert.equal(result.status, "FAIL");
      assert.equal(result.failureClass, "MANIFEST_MISMATCH");
    })
  );

  results.push(
    await runCheck("SETTLEMENT_MISMATCH", async () => {
      const canonicalJson = canonicalizeSettlementPayload(buildCanonicalPayload());
      const result = await runVerificationCase({
        canonicalJson,
        settlementHash: HASH_D,
      });

      assert.equal(result.status, "FAIL");
      assert.equal(result.failureClass, "SETTLEMENT_MISMATCH");
    })
  );

  results.push(
    await runCheck("CHAIN_ROOT_INVALID", async () => {
      const canonicalJson = canonicalizeSettlementPayload(buildCanonicalPayload());
      const settlementHash = recomputeFreightSettlementHash(canonicalJson);
      const validRoot = computeChainRoot({
        paymentSnapshotHash: HASH_A,
        exportManifestHash: HASH_B,
        freightSettlementHash: settlementHash,
      });

      const result = await runVerificationCase({
        canonicalJson,
        settlementHash,
        declaredChainRootSha256: HASH_D,
      });

      assert.notEqual(validRoot, HASH_D, "Test fixture bug: invalid root equals valid root");
      assert.equal(result.status, "FAIL");
      assert.equal(result.failureClass, "CHAIN_ROOT_INVALID");
    })
  );

  results.push(
    await runCheck("MISSING_REFERENCE", async () => {
      const result = await runVerificationCase({
        includeManifest: false,
      });

      assert.equal(result.status, "FAIL");
      assert.equal(result.failureClass, "MISSING_REFERENCE");
    })
  );

  const failed = results.filter((result) => !result.pass);
  for (const result of results) {
    console.log(`[${result.pass ? "PASS" : "FAIL"}] ${result.id} :: ${result.details}`);
  }

  console.log(`SUMMARY total=${results.length} pass=${results.length - failed.length} fail=${failed.length}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
