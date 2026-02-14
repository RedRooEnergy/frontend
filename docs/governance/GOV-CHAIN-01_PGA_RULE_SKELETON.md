# GOV-CHAIN-01 — Platform Governance Aggregator Rule Skeleton
Version: v1.0
Status: DESIGN LOCK (Static Checks Only)
Classification: Internal Governance / Cross-Subsystem Integrity
Authority Impact: NONE
Mutation Rights Introduced: NONE
Runtime Authorization: NOT GRANTED
Change Control: REQUIRED

## 1. Objective

Define a static-analysis governance rule skeleton for EXT-CHAIN-INTEGRITY-01 so cross-subsystem linkage controls can be evaluated deterministically without runtime dependency, network access, or state mutation.

This skeleton defines rule shape, pass/fail semantics, and badge impact only. It does not authorize implementation enforcement in payment, export, or freight runtime paths.

## 2. Rule Identity

- Rule ID: `GOV-CHAIN-01`
- Rule Name: `Cross-Subsystem Cryptographic Integrity`
- Category: `Platform / Integrity Chain`
- Severity: `CRITICAL`
- Score Mode: `Binary PASS/FAIL`
- Authority Expansion: `NONE`
- Evaluation Mode: `Static file and source inspection only`

## 3. Scope Boundaries

In scope:
- Static verification of required governance artefacts
- Static verification of deterministic chain doctrine declarations
- Static verification of immutability declarations and planned enforcement hooks
- Static verification that invariant test scaffolding is defined

Out of scope:
- Runtime endpoint calls
- Database reads/writes
- Any payout/escrow/freeze enforcement
- Any mutation authorization
- Any operational workflow execution

## 4. Required Inputs (Static Evidence Set)

The rule evaluation must inspect these artefacts:
- `docs/communications/EXT-CHAIN-INTEGRITY-01_ASSERTION.md`
- `docs/communications/EXT-CHAIN-INTEGRITY-01_SCHEMA_DESIGN_PACK.md`
- `docs/governance/PLATFORM_GOVERNANCE_RULE_REGISTRY.md`

Implementation-phase static inputs (when authorized) may be added under change control:
- Deterministic chain computation module (source)
- Canonical settlement serializer module (source)
- Write-once immutability guard declarations (schema/store source)
- Invariant test scaffolding files

## 5. Static Check Contract

`GOV-CHAIN-01` must evaluate these check groups.

### 5.1 Design-Lock Artefact Presence

PASS requires:
- `EXT-CHAIN-INTEGRITY-01` assertion document exists
- schema design pack exists
- both artefacts declare design-lock/no-runtime-authorization posture

FAIL if any required artefact is missing or lacks explicit non-authorization statements.

### 5.2 Deterministic Chain Doctrine

PASS requires explicit declaration of:
- fixed chain ordering: `paymentSnapshotHash`, `exportManifestHash`, `freightSettlementHash`
- deterministic formula: `SHA256(paymentSnapshotHash + exportManifestHash + freightSettlementHash)`
- lowercase 64-char hex constraint
- no salt/no entropy/no delimiter doctrine

FAIL if ordering or algorithm doctrine is absent or ambiguous.

### 5.3 Write-Once Integrity Declaration

PASS requires explicit declaration that these fields are immutable once set:
- `ExportManifest.paymentSnapshotHash`
- `ExportManifest.exportManifestHash`
- `FreightSettlement.paymentSnapshotHash`
- `FreightSettlement.exportManifestHash`
- `FreightSettlement.freightSettlementHash`

PASS also requires prohibition of history rewrite/backfill mutation.

FAIL if write-once scope is incomplete or mutable rewrite is permitted.

### 5.4 Canonical Settlement Serialization Declaration

PASS requires explicit declaration of canonical serialization constraints:
- stable lexicographic key ordering
- UTF-8 encoding
- no insignificant whitespace
- normalized number representation
- deterministic array ordering rules

FAIL if canonicalization requirements are missing or non-deterministic.

### 5.5 Invariant Verification Scaffolding Requirement

PASS requires explicit requirement that invariant checks exist for:
- snapshot/manifest/settlement mismatch detection
- chain root mismatch detection
- missing reference detection

Design-lock note:
- At skeleton stage, presence of requirement text is sufficient.
- At implementation authorization stage, source-level test presence becomes mandatory.

FAIL if mismatch taxonomy or invariant requirement is absent.

## 6. Badge and Scoring Behavior

Rule effect is deterministic and non-overridable:
- If `GOV-CHAIN-01 = PASS`: no penalty, integrity indicator remains healthy.
- If `GOV-CHAIN-01 = FAIL`:
  - Platform governance badge state = `DEGRADED`
  - Cryptographic integrity indicator = `RED`
  - Governance score deduction recommendation = `12%`

No partial credit, no soft-pass, no auto-override allowed.

## 7. CI Gating Contract (Design-Lock)

This skeleton defines the future CI posture:
- Governance CI must evaluate `GOV-CHAIN-01` deterministically.
- Pipeline must fail when rule status is `FAIL` once rule is activated.
- Activation timing remains subject to change control and implementation readiness.

Design-lock constraint:
- This document does not itself activate CI gating.

## 8. Explicit Non-Authorization Statement

`GOV-CHAIN-01` skeleton does not authorize:
- Escrow gating
- Payout blocking
- Payment blocking
- Automatic freeze actions
- Runtime mutation hooks
- Endpoint additions

This is a governance rule definition only.

## 9. Failure Classification Mapping

The rule must map to these CRITICAL failure classes when implemented:
- `SNAPSHOT_MISMATCH`
- `MANIFEST_MISMATCH`
- `SETTLEMENT_MISMATCH`
- `CHAIN_ROOT_INVALID`
- `MISSING_REFERENCE`

Any single class occurrence must force `FAIL`.

## 10. Change Control

Any modification to:
- Rule severity
- Binary scoring policy
- Deduction weight
- Deterministic chain formula
- Canonicalization requirements
- Immutability scope

requires:
- formal change request
- version increment
- registry update
- re-ratification under governance process

No exceptions.

## 11. Next Governance Steps

After locking this skeleton:
1. Add `GOV-CHAIN-01` placeholder entry to the governance rule registry.
2. Draft invariant test scaffolding specification (static contract only).
3. Draft EXT-CHAIN-INTEGRITY-01 design-lock close pack outline.
4. Seek change-control approval before any runtime authorization.
