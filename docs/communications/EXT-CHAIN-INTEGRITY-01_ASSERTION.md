# EXT-CHAIN-INTEGRITY-01 — Cross-Subsystem Cryptographic Assurance
Version: v1.0
Status: DESIGN LOCK (No Runtime Authorization)
Classification: Internal Governance / Cryptographic Control
Authority Impact: NONE
Mutation Rights Introduced: NONE
Change Control: REQUIRED for expansion

## 1. Purpose

EXT-CHAIN-INTEGRITY-01 defines deterministic cryptographic linkage across:
- Payment Snapshot
- Export Manifest
- Freight Settlement

The extension objective is integrity correlation and replay-verifiable consistency across subsystems. This extension does not create operational authority, enforcement authority, or mutation rights.

## 2. Governance Principles

This extension is bound by:
- Immutable Core supremacy
- No new signing authority
- No override paths
- No mutation APIs
- Deterministic hash chaining
- Static verification without runtime trust assumptions

## 3. Pre-Extension Gap Statement

Current subsystem artefacts are individually immutable but cryptographically isolated. There is no mandatory cross-reference chain binding:
- Payment Snapshot -> Export Manifest
- Export Manifest -> Freight Settlement
- Freight Settlement -> Payment Snapshot

This extension closes that integrity gap.

## 4. Deterministic Chain Model

### 4.1 Canonical Chain Root

`chainRootSha256 = SHA256(paymentSnapshotHash + exportManifestHash + freightSettlementHash)`

All concatenated values must be lowercase 64-char SHA-256 hex and encoded in UTF-8 with no delimiter.

### 4.2 Cross-Reference Requirements

- Export Manifest must include `paymentSnapshotHash`.
- Freight Settlement must include `paymentSnapshotHash` and `exportManifestHash`.
- Freight Settlement must include `freightSettlementHash` derived from canonical settlement payload.

### 4.3 Canonical Ordering

Ordering is fixed and immutable:
1. `paymentSnapshotHash`
2. `exportManifestHash`
3. `freightSettlementHash`

No salts, random inputs, UUIDs, or timestamp-based entropy permitted in chain computation.

## 5. Subsystem Assertions

### 5.1 Payment Snapshot

Must provide immutable:
- `orderId`
- `pricingVersion`
- `paymentSnapshotHash`

### 5.2 Export Manifest

Must provide immutable:
- `paymentSnapshotHash`
- `exportManifestHash`

`exportManifestHash` must be computed from shipped `manifest.json` bytes.

### 5.3 Freight Settlement

Must provide immutable:
- `orderId`
- `paymentSnapshotHash`
- `exportManifestHash`
- `freightSettlementHash`

`freightSettlementHash` must be computed from canonical settlement record payload.

## 6. Integrity Verification Assertions

The following checks must be statically and deterministically verifiable:
- Payment Snapshot hash equals value embedded in Export Manifest.
- Export Manifest hash equals value embedded in Freight Settlement.
- Freight Settlement hash equals recomputed canonical settlement hash.
- Chain root recomputes deterministically for the same evidence set.

Any mismatch results in `INVALID` chain status with CRITICAL severity.

## 7. Aggregator Governance Rule Contract

Rule ID: `GOV-CHAIN-01`  
Category: Cross-Subsystem Cryptographic Integrity  
Severity: CRITICAL  
Scoring: Binary PASS/FAIL only  
Authority Expansion: NONE

PASS requires:
- Hash cross-references present and immutable
- Deterministic chain computation function present
- Mismatch detection test invariants present
- Close Pack artefact present

FAIL conditions include:
- Missing linkage hash fields
- Mutable linkage fields
- Missing deterministic chain logic
- Missing invariant tests

On FAIL:
- Badge state must degrade
- Cryptographic integrity pill must be RED
- Governance score deduction applies per approved weighting

## 8. Schema Design Lock Requirements

Write-once linkage fields (immutable once set):
- `paymentSnapshotHash`
- `exportManifestHash`
- `freightSettlementHash`

Validation requirements:
- lowercase hex
- exact 64 characters
- SHA-256 format

Any post-write mutation attempt must fail.

## 9. Verification Utility Contract (Design Only)

A read-only verification utility must be defined in implementation phase:
- Input: `orderId`
- Resolve payment snapshot, export manifest, freight settlement
- Recompute artefact hashes and chain root
- Output: PASS/FAIL + deterministic evidence block

This utility must not mutate state and must not require privileged write access.

## 10. Explicit Non-Authorization Statement

This design lock does not authorize:
- Escrow gating
- Payment blocking
- Freight payout blocking
- Automatic freeze logic
- Signing authority changes

All enforcement decisions remain out of scope for this extension phase.

## 11. Failure Classification Contract

CRITICAL failure classes:
- `SNAPSHOT_MISMATCH`
- `MANIFEST_MISMATCH`
- `SETTLEMENT_MISMATCH`
- `CHAIN_ROOT_INVALID`
- `MISSING_REFERENCE`

No partial credit is permitted.

## 12. Change Control

Any modification to:
- Canonical ordering
- Hash algorithm
- Field immutability
- Cross-reference semantics
- Aggregator weighting

Requires:
- Formal change request
- Version increment
- Updated Close Pack
- Updated board ratification

No exceptions.

## 13. Expected Governance Outcome

Upon implementation under approved change control:
- Payment/export/settlement divergence becomes cryptographically detectable.
- Cross-subsystem tampering becomes externally demonstrable.
- Regulator and investor defensibility increases without authority expansion.

## 14. Next Design-Lock Sequence

After approval of this assertion document:
1. Schema design pack (write-once linkage fields)
2. Aggregator rule skeleton (`GOV-CHAIN-01`)
3. Invariant test scaffolding
4. Close Pack draft

Runtime enforcement remains unauthorized until later ratified phases.
