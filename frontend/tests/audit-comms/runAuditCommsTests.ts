import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeUnifiedEvidenceRows } from "../../lib/auditComms/normalize/unifiedEvidenceNormalizer";
import { buildDeterministicScopeLabel } from "../../lib/auditComms/hash/scopeLabel";
import { computeCompositeEvidenceHash } from "../../lib/auditComms/hash/compositeEvidenceHash";
import { renderAuditCommsSlice, getRegulatorSuppressedKeyList } from "../../lib/auditComms/slice/sliceRenderer";
import {
  assembleEvidencePack,
  verifyEvidencePackManifestIntegrity,
} from "../../lib/auditComms/export/evidencePackAssembler";
import { verifyCompositeEvidenceHash } from "../../lib/auditComms/verify/hashVerification";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const AUDIT_COMMS_ROOT = path.join(FRONTEND_ROOT, "lib", "auditComms");
const API_ROOT = path.join(FRONTEND_ROOT, "app", "api");

type TestResult = {
  id: string;
  pass: boolean;
  details: string;
};

async function runCheck(id: string, fn: () => void | Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { id, pass: true, details: "PASS" };
  } catch (error: any) {
    return {
      id,
      pass: false,
      details: String(error?.message || error),
    };
  }
}

function fixtureRows() {
  return [
    {
      channelName: "WECHAT" as const,
      dispatchId: "w-2",
      createdAt: "2026-02-14T01:02:03.000Z",
      payloadHash: "b".repeat(64),
      statusProgressionHash: "c".repeat(64),
      statusSummary: "DELIVERED",
      correlationRefs: { orderId: "ORD-100" },
      providerStatus: "DELIVERED",
      providerErrorCodeRedacted: "REDACTED",
    },
    {
      channelName: "EMAIL" as const,
      dispatchId: "e-1",
      createdAt: "2026-02-14T01:02:03.000Z",
      payloadHash: "a".repeat(64),
      statusProgressionHash: "d".repeat(64),
      statusSummary: "SENT",
      correlationRefs: { orderId: "ORD-100" },
      providerStatus: "SENT",
      providerErrorCodeRedacted: null,
    },
    {
      channelName: "EMAIL" as const,
      dispatchId: "e-0",
      createdAt: "2026-02-14T00:00:00.000Z",
      payloadHash: "e".repeat(64),
      statusProgressionHash: null,
      statusSummary: "QUEUED",
      correlationRefs: { orderId: "ORD-100" },
      providerStatus: "QUEUED",
      providerErrorCodeRedacted: null,
    },
  ];
}

function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile()) out.push(fullPath);
    }
  }
  return out;
}

async function main() {
  const results: TestResult[] = [];

  results.push(
    await runCheck("DET-ORDER-HASH", () => {
      const rowsA = normalizeUnifiedEvidenceRows({
        correlationKey: { keyType: "orderId", keyValue: "ORD-100" },
        rows: fixtureRows(),
        redactionLevel: "ADMIN",
      });
      const rowsB = normalizeUnifiedEvidenceRows({
        correlationKey: { keyType: "orderId", keyValue: "ORD-100" },
        rows: fixtureRows(),
        redactionLevel: "ADMIN",
      });

      assert.equal(JSON.stringify(rowsA), JSON.stringify(rowsB), "Normalized row ordering is not deterministic");

      const scope = buildDeterministicScopeLabel({
        correlationKey: { keyType: "orderId", keyValue: "ORD-100" },
        sliceType: "ADMIN",
        filters: { channels: ["EMAIL", "WECHAT"], statuses: ["SENT", "DELIVERED"] },
      });

      const hashA = computeCompositeEvidenceHash({ rows: rowsA, scopeLabel: scope, expectedChannels: ["EMAIL", "WECHAT"] });
      const hashB = computeCompositeEvidenceHash({ rows: rowsB, scopeLabel: scope, expectedChannels: ["EMAIL", "WECHAT"] });

      assert.equal(hashA.compositeEvidenceHash, hashB.compositeEvidenceHash, "Composite hash is not deterministic");
    })
  );

  results.push(
    await runCheck("PLACEHOLDER-PARTIAL", () => {
      const rows = normalizeUnifiedEvidenceRows({
        correlationKey: { keyType: "orderId", keyValue: "ORD-100" },
        rows: fixtureRows(),
        redactionLevel: "REGULATOR",
      });
      const scope = buildDeterministicScopeLabel({
        correlationKey: { keyType: "orderId", keyValue: "ORD-100" },
        sliceType: "REGULATOR",
      });
      const hash = computeCompositeEvidenceHash({ rows, scopeLabel: scope, expectedChannels: ["EMAIL", "WECHAT"] });
      assert.equal(hash.placeholderUsed, true, "Expected placeholder usage for missing statusProgressionHash");
      assert.equal(hash.completenessLabel, "PARTIAL", "Expected PARTIAL completeness when placeholder is used");
    })
  );

  results.push(
    await runCheck("REGULATOR-SUPPRESSION", () => {
      const rows = normalizeUnifiedEvidenceRows({
        correlationKey: { keyType: "orderId", keyValue: "ORD-100" },
        rows: fixtureRows(),
        redactionLevel: "ADMIN",
      });
      const scope = buildDeterministicScopeLabel({
        correlationKey: { keyType: "orderId", keyValue: "ORD-100" },
        sliceType: "REGULATOR",
      });
      const hash = computeCompositeEvidenceHash({ rows, scopeLabel: scope, expectedChannels: ["EMAIL", "WECHAT"] });
      const rendered = renderAuditCommsSlice({
        sliceType: "REGULATOR",
        rows,
        composite: hash,
        generatedAt: "2026-02-14T13:00:00.000Z",
      });

      const blockedKeys = new Set(getRegulatorSuppressedKeyList());
      for (const row of rendered.channelEvidence as Array<Record<string, unknown>>) {
        for (const key of Object.keys(row)) {
          assert(!blockedKeys.has(key), `Regulator row exposed blocked key: ${key}`);
        }
      }
    })
  );

  results.push(
    await runCheck("EXPORT-MANIFEST-INTEGRITY", () => {
      const rows = normalizeUnifiedEvidenceRows({
        correlationKey: { keyType: "orderId", keyValue: "ORD-100" },
        rows: fixtureRows(),
        redactionLevel: "ADMIN",
      });
      const scope = buildDeterministicScopeLabel({
        correlationKey: { keyType: "orderId", keyValue: "ORD-100" },
        sliceType: "ADMIN",
      });
      const hash = computeCompositeEvidenceHash({ rows, scopeLabel: scope, expectedChannels: ["EMAIL", "WECHAT"] });
      const rendered = renderAuditCommsSlice({
        sliceType: "ADMIN",
        rows,
        composite: hash,
        generatedAt: "2026-02-14T13:05:00.000Z",
      });

      const pack = assembleEvidencePack({ view: rendered });
      const integrity = verifyEvidencePackManifestIntegrity(pack);
      assert.equal(integrity.valid, true, "Manifest integrity should be valid");
      assert.equal(integrity.manifestHashMatches, true, "manifestHash mismatch");
      assert.equal(integrity.artifactHashMatches, true, "artifact hash mismatch");
      assert.equal(integrity.artifactByteMatches, true, "artifact byte mismatch");
    })
  );

  results.push(
    await runCheck("VERIFY-MATCH-MISMATCH", () => {
      const rows = normalizeUnifiedEvidenceRows({
        correlationKey: { keyType: "orderId", keyValue: "ORD-100" },
        rows: fixtureRows(),
        redactionLevel: "ADMIN",
      });
      const scope = buildDeterministicScopeLabel({
        correlationKey: { keyType: "orderId", keyValue: "ORD-100" },
        sliceType: "ADMIN",
      });
      const hash = computeCompositeEvidenceHash({ rows, scopeLabel: scope, expectedChannels: ["EMAIL", "WECHAT"] });

      const match = verifyCompositeEvidenceHash({
        rows,
        scopeLabel: scope,
        completenessLabel: hash.completenessLabel,
        expectedCompositeEvidenceHash: hash.compositeEvidenceHash,
        expectedChannels: ["EMAIL", "WECHAT"],
      });
      assert.equal(match.status, "MATCH", "Expected MATCH for identical evidence/hash");

      const mismatch = verifyCompositeEvidenceHash({
        rows,
        scopeLabel: scope,
        completenessLabel: hash.completenessLabel,
        expectedCompositeEvidenceHash: "f".repeat(64),
        expectedChannels: ["EMAIL", "WECHAT"],
      });
      assert.equal(mismatch.status, "MISMATCH", "Expected MISMATCH for altered expected hash");
    })
  );

  results.push(
    await runCheck("SCAN-PROHIBITED-PATTERNS", () => {
      const files = walkFiles(AUDIT_COMMS_ROOT).filter((filePath) => /\.(ts|tsx)$/.test(filePath));
      assert(files.length > 0, "No auditComms files found for scan");

      const mutationPattern = /\b(insertOne|updateOne|deleteOne|bulkWrite|replaceOne|findOneAndUpdate|findOneAndDelete)\b|\b(POST\(|PUT\(|PATCH\(|DELETE\()/;
      for (const filePath of files) {
        const source = fs.readFileSync(filePath, "utf8");
        assert(!mutationPattern.test(source), `Prohibited mutation pattern found in ${path.relative(FRONTEND_ROOT, filePath)}`);
      }

      const apiFiles = walkFiles(API_ROOT).filter((filePath) => /\.(ts|tsx)$/.test(filePath));
      const auditCommsApiFiles = apiFiles.filter((filePath) => filePath.toLowerCase().includes("audit-comms"));
      assert.equal(auditCommsApiFiles.length, 0, "Audit-comms route handlers must not exist in this phase");
    })
  );

  const passCount = results.filter((result) => result.pass).length;
  const failCount = results.length - passCount;

  for (const result of results) {
    process.stdout.write(`${result.pass ? "PASS" : "FAIL"} ${result.id} ${result.details}\n`);
  }

  process.stdout.write(`SUMMARY total=${results.length} pass=${passCount} fail=${failCount}\n`);
  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: any) => {
  process.stderr.write(`${String(error?.message || error)}\n`);
  process.exitCode = 1;
});
