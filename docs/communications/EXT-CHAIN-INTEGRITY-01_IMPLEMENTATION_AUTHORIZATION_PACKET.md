# EXT-CHAIN-INTEGRITY-01 — Implementation Authorization Packet
Version: v1.0
Status: BOARD APPROVAL PENDING
Classification: Internal Governance / Authorization Control
Authority Impact: NONE (integrity assurance only)
Mutation Rights Introduced: NONE beyond write-once linkage persistence
Change Control: REQUIRED

## 1. Purpose

This packet defines the bounded implementation authorization request for EXT-CHAIN-INTEGRITY-01.

The objective is to move from design-lock artefacts to controlled implementation of deterministic
cross-subsystem integrity linkage between Payment Snapshot, Export Manifest, and Freight Settlement.

This packet does not itself grant approval. It defines what may be authorized by board resolution.

## 2. Baseline and Dependencies

Design-lock baseline artefacts:
- `docs/communications/EXT-CHAIN-INTEGRITY-01_ASSERTION.md` (`d97b167`)
- `docs/communications/EXT-CHAIN-INTEGRITY-01_SCHEMA_DESIGN_PACK.md` (`07c3fb1`)
- `docs/governance/GOV-CHAIN-01_PGA_RULE_SKELETON.md` (`d3211d3`)
- `docs/communications/EXT-CHAIN-INTEGRITY-01_INVARIANT_TEST_SCAFFOLDING_SPEC.md` (`c957fe4`)
- `docs/communications/EXT-CHAIN-INTEGRITY-01_CLOSE_PACK.md` (`e53af52`)

Authorization dependency:
- Formal board resolution adopting this packet with no scope expansion.

## 3. Proposed Implementation Scope (If Approved)

The following implementation scope is requested and bounded.

### 3.1 Data Linkage Persistence (Write-Once)

Authorize implementation of write-once linkage fields for:
- Export Manifest: `paymentSnapshotHash`, `exportManifestHash`
- Freight Settlement: `paymentSnapshotHash`, `exportManifestHash`, `freightSettlementHash`,
  `settlementPayloadCanonicalJson` (FINAL only)

Constraints:
- lowercase 64-char SHA-256 hex validation
- immutable once set
- no history rewrite

### 3.2 Deterministic Hashing and Canonicalization

Authorize implementation of:
- canonical settlement JSON generation per design-lock doctrine
- deterministic chain computation:
  `chainRootSha256 = SHA256(paymentSnapshotHash + exportManifestHash + freightSettlementHash)`

Constraints:
- UTF-8 bytes
- fixed ordering (payment -> manifest -> settlement)
- no delimiter/salt/entropy

### 3.3 Read-Only Verification Utility

Authorize implementation of read-only verification utility output for:
- PASS/FAIL chain status
- failure taxonomy classification
- recomputed vs stored hash evidence

Constraints:
- no mutation side effects
- no payout/escrow authority
- no automatic freeze actions

### 3.4 Invariant Test Implementation

Authorize implementation of deterministic invariant tests for:
- baseline PASS case
- mismatch classes
- missing reference class
- canonical serialization determinism

Constraints:
- deterministic fixtures only
- no network dependency
- no production mutation

### 3.5 Governance Aggregator Activation (GOV-CHAIN-01)

Authorize activation of `GOV-CHAIN-01` only after implementation criteria are met.

Activation includes:
- rule transition from skeleton to active static checks
- badge/scoring behavior aligned to rule policy
- CI fail-gate when rule status is FAIL

## 4. Explicit Non-Authorized Features

The following remain explicitly out of scope even after implementation authorization:
- escrow/payout blocking
- payment hold or freight hold automation
- auto-freeze of orders or settlements
- runtime mutation endpoints for regulator surfaces
- authority override controls
- signature/key lifecycle expansion unrelated to chain linkage
- backfill rewriting of historical records

Any request for these features requires a new extension phase and separate approval packet.

## 5. PGA Activation Sequence (Controlled)

Activation sequence must follow this order:

1. Implement linkage fields and immutability guards.
2. Implement deterministic chain compute and canonical serializer.
3. Implement read-only verification utility output.
4. Implement invariant test suite and pass baseline.
5. Promote `GOV-CHAIN-01` from skeleton to active static rule.
6. Enable governance CI fail-gate for `GOV-CHAIN-01`.
7. Update governance registry and index summary.
8. Draft implementation close pack and request board ratification.

No step skipping is permitted.

## 6. Rollback Plan (Governance-Safe)

Rollback objective: preserve evidence integrity while disabling active governance gating if needed.

Rollback triggers:
- deterministic mismatch false positives caused by implementation defect
- immutability enforcement defect causing invalid write attempts
- CI instability preventing controlled release

Rollback actions:
1. Revert `GOV-CHAIN-01` to skeleton/non-active state.
2. Disable CI fail-gate tied to active `GOV-CHAIN-01`.
3. Retain already persisted write-once hashes; no retroactive edits.
4. Keep verification utility read-only; mark status as provisional if needed.
5. Issue governance incident note with remediation timeline.

Rollback constraints:
- no deletion of integrity evidence
- no mutation of finalized hash fields
- no authority escalation during rollback

## 7. Acceptance Criteria for Authorization Execution

Implementation authorization is considered successfully executed only if all conditions pass:
- write-once linkage fields enforced and validated
- canonical settlement serializer deterministic under test fixtures
- chain recomputation deterministically reproducible
- failure taxonomy correctly classified under simulations
- `GOV-CHAIN-01` active rule reports deterministic PASS/FAIL
- governance CI fails on deliberate rule-break simulation
- no unauthorized feature surfaces introduced

Any FAIL condition blocks closure and requires remediation under change control.

## 8. Board Approval Resolution Template

Resolution ID: `BR-EXT-CHAIN-INTEGRITY-01-IMPLEMENTATION-v1.0`

Proposed resolution text:

"The Board approves implementation authorization for EXT-CHAIN-INTEGRITY-01 within the
bounded scope defined in `docs/communications/EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_AUTHORIZATION_PACKET.md`.

This authorization is limited to deterministic integrity linkage, read-only verification,
invariant test implementation, and controlled activation of `GOV-CHAIN-01`.

No escrow/payout enforcement, authority expansion, or runtime mutation surface expansion is authorized.
Any deviation requires formal change control and re-approval."

Required approvers:
- Board Chair
- CTO / Engineering Authority
- Compliance Lead

Approval record requirements:
- meeting date
- approving signatures
- baseline commit hash
- scope exceptions (if any; default none)

## 9. Post-Approval Deliverables

Upon approval, the implementation phase must produce:
- implementation commit chain with isolated checkpoints
- active `GOV-CHAIN-01` registry entry
- CI evidence of gating behavior
- implementation close pack
- board ratification update

## 10. Final Statement

This packet is an authorization request artefact only.

Until board approval is recorded, EXT-CHAIN-INTEGRITY-01 remains:
- design-lock closed
- implementation not authorized
- governance-only.
