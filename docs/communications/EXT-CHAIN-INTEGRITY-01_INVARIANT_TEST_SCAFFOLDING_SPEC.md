# EXT-CHAIN-INTEGRITY-01 — Invariant Test Scaffolding Specification
Version: v1.0
Status: DESIGN LOCK (Static Contract Only)
Classification: Internal Governance / Integrity Verification
Authority Impact: NONE
Mutation Rights Introduced: NONE
Runtime Authorization: NOT GRANTED
Change Control: REQUIRED

## 1. Objective

Define the invariant test scaffolding contract for EXT-CHAIN-INTEGRITY-01 so future implementation can verify cross-subsystem hash linkage deterministically.

This document defines required simulation classes, expected PASS/FAIL behavior, and evidence output contracts. It does not authorize runtime tests, schema changes, endpoint changes, or enforcement activation.

## 2. Scope Boundaries

In scope:
- static test category definitions
- mismatch simulation taxonomy
- deterministic recomputation expectations
- expected output and failure class mapping

Out of scope:
- executable test code
- CI activation
- runtime mutation checks against production systems
- payout/escrow enforcement behavior

## 3. Inputs and Canonical References

The scaffolding contract is bound to:
- `docs/communications/EXT-CHAIN-INTEGRITY-01_ASSERTION.md`
- `docs/communications/EXT-CHAIN-INTEGRITY-01_SCHEMA_DESIGN_PACK.md`
- `docs/governance/GOV-CHAIN-01_PGA_RULE_SKELETON.md`

Canonical chain formula under test:
- `chainRootSha256 = SHA256(paymentSnapshotHash + exportManifestHash + freightSettlementHash)`

Deterministic constraints under test:
- all hashes lowercase hex, length 64
- fixed ordering: payment -> manifest -> settlement
- UTF-8 bytes
- no delimiter, no salt, no nonce

## 4. Invariant Test Categories (Static Contract)

### 4.1 Baseline Consistency

Purpose:
- confirm valid linked artefacts produce `PASS`

Required assertions:
- snapshot hash matches manifest reference
- manifest hash matches settlement reference
- recomputed settlement hash matches stored settlement hash
- recomputed chain root matches expected chain root

Expected result:
- `status = PASS`
- `failureClass = null`

### 4.2 Snapshot Mismatch Detection

Simulation:
- manifest references a `paymentSnapshotHash` that differs from snapshot source

Expected result:
- `status = FAIL`
- `failureClass = SNAPSHOT_MISMATCH`

### 4.3 Manifest Mismatch Detection

Simulation:
- settlement references an `exportManifestHash` that differs from recomputed/stored manifest hash

Expected result:
- `status = FAIL`
- `failureClass = MANIFEST_MISMATCH`

### 4.4 Settlement Mismatch Detection

Simulation:
- `freightSettlementHash` differs from hash recomputed from canonical settlement JSON

Expected result:
- `status = FAIL`
- `failureClass = SETTLEMENT_MISMATCH`

### 4.5 Chain Root Mismatch Detection

Simulation:
- component hashes are present but provided chain root differs from deterministic recomputation

Expected result:
- `status = FAIL`
- `failureClass = CHAIN_ROOT_INVALID`

### 4.6 Missing Reference Detection

Simulation:
- one or more required linkage references are absent (`paymentSnapshotHash`, `exportManifestHash`, `freightSettlementHash`)

Expected result:
- `status = FAIL`
- `failureClass = MISSING_REFERENCE`

## 5. Canonical Serialization Validation Cases

Scaffolding must define validation cases that prove canonical settlement JSON determinism:
- key order differences in source input must not change canonical output
- insignificant whitespace changes must not change recomputed hash
- equivalent number formatting variants must normalize identically
- tracking number ordering must be deterministic per schema pack

Expected result:
- equivalent semantic payloads produce identical `freightSettlementHash`
- non-equivalent payload changes produce different `freightSettlementHash`

## 6. Test Data Scaffolding Requirements

The scaffolding specification must require deterministic fixtures with:
- stable `orderId`
- fixed hash-like placeholders for snapshot/manifest/settlement
- canonical settlement payload samples for PASS and FAIL cases
- explicit timestamp strings in ISO-8601 UTC

Fixture design constraints:
- no random IDs
- no runtime-generated entropy
- no environment-dependent values

## 7. Expected Verification Output Contract

Every scaffolded test case must evaluate against this output shape:

```json
{
  "orderId": "...",
  "status": "PASS | FAIL",
  "failureClass": null,
  "hashes": {
    "paymentSnapshotHash": "...",
    "exportManifestHash": "...",
    "freightSettlementHash": "...",
    "chainRootSha256": "..."
  },
  "evidence": {
    "paymentSnapshot": {
      "sourceRecordId": "...",
      "hashField": "pricingSnapshotHash"
    },
    "exportManifest": {
      "sourceRecordId": "...",
      "storedManifestHash": "...",
      "recomputedManifestHash": "..."
    },
    "freightSettlement": {
      "sourceRecordId": "...",
      "storedSettlementHash": "...",
      "recomputedSettlementHash": "..."
    }
  },
  "computedAt": "ISO-8601 UTC"
}
```

Contract constraints:
- `computedAt` may vary
- all other fields must be deterministic for fixed fixtures

## 8. PASS/FAIL Matrix Contract

Minimum matrix to be represented in scaffolding:
- PASS_BASELINE -> PASS / null
- FAIL_SNAPSHOT_MISMATCH -> FAIL / SNAPSHOT_MISMATCH
- FAIL_MANIFEST_MISMATCH -> FAIL / MANIFEST_MISMATCH
- FAIL_SETTLEMENT_MISMATCH -> FAIL / SETTLEMENT_MISMATCH
- FAIL_CHAIN_ROOT_INVALID -> FAIL / CHAIN_ROOT_INVALID
- FAIL_MISSING_REFERENCE -> FAIL / MISSING_REFERENCE

No partial passes.
No warning-only outcomes.
Each failure class is CRITICAL.

## 9. Non-Regression Requirements

The scaffolding contract must prevent drift from core doctrine:
- no alteration of chain hash ordering
- no alteration of hash algorithm
- no acceptance of uppercase/non-64 hash values
- no acceptance of mutable linkage field semantics
- no silent downgrade from FAIL to PASS

Any drift is classified as critical governance regression.

## 10. CI and Activation Posture

Design-lock statement:
- this document does not activate CI checks
- this document does not add runnable tests

Future activation conditions (under change control):
- invariant test implementation exists
- deterministic fixtures committed
- `GOV-CHAIN-01` moved from skeleton to active static rule enforcement

## 11. Explicit Non-Authorization Statement

This scaffolding specification does not authorize:
- runtime enforcement holds
- payout/escrow blocking
- endpoint additions
- schema migrations
- mutation controls

It defines test contract expectations only.

## 12. Change Control

Any modification to:
- failure class taxonomy
- output contract shape
- determinism constraints
- PASS/FAIL mapping

requires:
- formal change request
- version increment
- synchronized updates to assertion/schema/rule skeleton artefacts

No exceptions.

## 13. Next Governance Steps

After locking this scaffolding specification:
1. Draft EXT-CHAIN-INTEGRITY-01 design-lock close pack outline.
2. Add GOV-CHAIN-01 placeholder entry to rule registry if not yet present.
3. Prepare implementation authorization packet (separate phase).
