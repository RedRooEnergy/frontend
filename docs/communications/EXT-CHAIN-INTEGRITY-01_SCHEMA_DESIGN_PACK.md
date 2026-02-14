# EXT-CHAIN-INTEGRITY-01
# Schema Design Pack — Governance-Only Specification
Version: v1.0
Status: DESIGN LOCK (No Runtime Authorization)
Classification: Internal Governance / Data Integrity Controls
Authority Impact: NONE
Mutation Rights Introduced: NONE
Change Control: REQUIRED for expansion

## 1. Purpose

This schema design pack defines the data model requirements to support deterministic linkage across:
- PaymentSnapshot <-> ExportManifest <-> FreightSettlement

It establishes:
- Canonical hashing inputs
- Write-once integrity fields
- Indexing and query patterns
- Backfill/transition policy without rewriting history
- Verification utility evidence outputs

No runtime authorization, enforcement gating, or payout blocking is authorized by this document.

## 2. Data Entities and Required Fields

### 2.1 PaymentSnapshot (existing; augmented for linkage)

Required fields (existing or already present per prior work):
- orderId: string (immutable reference)
- pricingVersion: string (or integer; immutable)
- pricingSnapshotHash: string (SHA-256 hex; immutable)

Linkage rules:
- pricingSnapshotHash is the canonical “payment snapshot hash” referenced by downstream artefacts.
- Do not rename the persisted field for this phase. Treat pricingSnapshotHash as the canonical paymentSnapshotHash value for chain purposes.

Validation:
- lowercase hex
- length = 64

### 2.2 ExportManifest (new or existing export record; linkage fields)

Required fields:
- orderId: string
- paymentSnapshotHash: string (64 hex, lowercase)
- exportManifestHash: string (64 hex, lowercase)
- manifestPath: string (path to manifest.json within export pack or artefact store)
- generatedAt: ISO string
- keyId: string (signature key id; if signatures enabled)
- signaturePresent: boolean (true if manifest.sig.txt exists)

Notes:
- exportManifestHash must equal SHA-256 over the exact manifest.json bytes shipped.
- paymentSnapshotHash must equal PaymentSnapshot.pricingSnapshotHash for the same orderId.

Validation:
- paymentSnapshotHash: 64 lowercase hex
- exportManifestHash: 64 lowercase hex

### 2.3 FreightSettlement (new or existing settlement record; linkage fields)

Required fields:
- orderId: string
- paymentSnapshotHash: string (64 hex, lowercase)
- exportManifestHash: string (64 hex, lowercase)
- freightSettlementHash: string (64 hex, lowercase)
- settlementVersion: string (e.g., "v1")
- settlementPayloadCanonicalJson: string (canonical JSON string used for hashing)
- createdAt: ISO string
- status: enum ("DRAFT", "FINAL", "VOID") — governance-defined only
- evidenceRefs: array of { type, id, hash?, path? } (read-only pointers to evidence artefacts)

Hash rule:
- freightSettlementHash = SHA-256(settlementPayloadCanonicalJson bytes)

Validation:
- each hash is 64 lowercase hex

## 3. Canonical Settlement JSON Definition

Purpose:
Define exactly what is hashed so freightSettlementHash is reproducible, deterministic, and independently verifiable.

### 3.1 Canonical JSON Requirements

The canonical settlement JSON string MUST be produced by:
- stable key ordering (lexicographic, ASCII)
- UTF-8 encoding
- no insignificant whitespace (minified)
- numbers normalized (no trailing .0; no scientific notation)
- arrays preserve original order as defined below
- nulls allowed only when explicitly defined
- timestamps must be ISO-8601 UTC ("Z")

Definition method:
Use a canonical JSON serializer (JCS / RFC 8785 style) or an equivalent deterministic implementation. The implementation choice is deferred; the output requirements are locked here.

### 3.2 Canonical Settlement Payload Shape (v1)

The canonical payload MUST contain only:

A) Identity and linkage
- schemaVersion: "FREIGHT_SETTLEMENT_CANONICAL_V1"
- orderId: string
- paymentSnapshotHash: string
- exportManifestHash: string

B) Commercial totals (AUD)
- currency: "AUD"
- subtotalAUD: integer (cents)
- shippingAUD: integer (cents)
- insuranceAUD: integer (cents)
- dutyAUD: integer (cents)
- gstAUD: integer (cents)
- totalAUD: integer (cents)

C) Logistics identifiers
- incoterm: "DDP" (fixed)
- carrierId: string
- shipmentId: string
- trackingNumbers: string[] (sorted lexicographically)
- lane: { originCountry, originPort?, destinationCountry, destinationPort? }

D) Compliance checkpoint refs
- compliance: {
  certificateIssued: boolean,
  certificateId?: string,
  certificateHash?: string
}

E) Settlement lifecycle (for audit context, not authority)
- settlementStatus: "FINAL" (only FINAL may be hashed for chain usage)
- finalizedAt: ISO string (UTC)

Explicit exclusions from canonical payload:
- internal notes
- actor identities
- mutable operational metadata
- non-deterministic fields (random ids, nonces)
- UI-only fields
- computed views that may change with formatting

### 3.3 Array ordering rules

- trackingNumbers: MUST be lexicographically sorted before hashing.
- evidenceRefs: MUST be sorted by (type, id) prior to hashing if included.
- Recommendation: exclude evidenceRefs from canonical payload and store separately; do not hash evidence list unless you are ready to lock ordering semantics permanently.

For v1, evidenceRefs MUST NOT be included in the canonical payload.

## 4. Write-Once Enforcement Rules (Design Lock)

Write-once fields:
- ExportManifest.paymentSnapshotHash
- ExportManifest.exportManifestHash
- FreightSettlement.paymentSnapshotHash
- FreightSettlement.exportManifestHash
- FreightSettlement.freightSettlementHash
- FreightSettlement.settlementPayloadCanonicalJson (for FINAL only)

Rule:
Once set to a non-empty value, these fields MUST NOT change.

Change attempts must fail at persistence layer.

Implementation note (not authorization):
This must be enforced using schema immutability guards (pre-save / pre-update hooks) or a dedicated write-once plugin pattern.

Mutation allowed only for:
- status transitions DRAFT -> FINAL (with hashes set at FINAL)
- VOID transition (must not alter previously FINAL-hashed record; instead create a new VOID record referencing the old hash)

No history rewrite allowed.

## 5. Indexes and Query Patterns

### 5.1 PaymentSnapshot

Indexes:
- unique(orderId, pricingVersion)
- index(pricingSnapshotHash)
- index(orderId)

Common queries:
- fetch snapshot by orderId (latest)
- fetch snapshot by hash

### 5.2 ExportManifest

Indexes:
- unique(orderId) OR unique(orderId, exportManifestHash) depending on whether multiple exports per order are allowed
- index(paymentSnapshotHash)
- index(exportManifestHash)
- index(orderId)

Query patterns:
- get by orderId
- correlate by paymentSnapshotHash
- retrieve by exportManifestHash for auditor evidence

### 5.3 FreightSettlement

Indexes:
- unique(orderId, settlementVersion, freightSettlementHash)
- index(orderId)
- index(paymentSnapshotHash)
- index(exportManifestHash)
- index(freightSettlementHash)
- index(status, createdAt)

Query patterns:
- get FINAL settlement by orderId
- correlate settlements by manifest hash
- fetch by hash for audit pack evidence

## 6. Backfill and Transition Handling (No History Rewrite)

Objective:
Introduce linkage fields without rewriting historical artefacts or mutating previously locked records.

### 6.1 Legacy Orders Without Export Manifest or Freight Settlement Hash

Policy:
- Do not backfill by mutating historical PaymentSnapshots.
- Create new linkage records (ExportManifest and/or FreightSettlement) only when the evidence exists to compute hashes deterministically.

Allowed actions:
- Create ExportManifest record referencing existing PaymentSnapshot hash if manifest.json exists in artefact storage.
- Create FreightSettlement record referencing ExportManifest hash if canonical settlement payload can be computed from locked settlement data.

Not allowed:
- Alter existing PaymentSnapshot hash
- Alter manifest.json
- Alter freight settlement facts to “make hashes match”

### 6.2 Transition Plan for In-Flight Orders

For orders in progress:
- Permit DRAFT FreightSettlement without hashes.
- On FINALIZATION:
  - compute settlementPayloadCanonicalJson
  - compute freightSettlementHash
  - persist write-once fields
  - compute chainRoot (in verification utility output; storage optional for v1)

### 6.3 Multiple Export Packs Per Order

If multiple exports exist:
- Each ExportManifest record must be immutable and uniquely identified (orderId + exportManifestHash).
- FreightSettlement must reference the specific exportManifestHash used for the shipment.

If you do not need multiple exports:
- enforce unique(orderId) for ExportManifest.

Decision required later; for design-lock v1, prefer allowing multiple exports to avoid forced mutation.

## 7. Verification Utility Evidence Outputs (Read-Only)

The verification utility must output a deterministic evidence object suitable for audit packs.

### 7.1 Evidence Output Shape (v1)

```json
{
  "orderId": "...",
  "status": "PASS" | "FAIL",
  "failureClass": null | "SNAPSHOT_MISMATCH" | "MANIFEST_MISMATCH" | "SETTLEMENT_MISMATCH" | "CHAIN_ROOT_INVALID" | "MISSING_REFERENCE",
  "hashes": {
    "paymentSnapshotHash": "...",
    "exportManifestHash": "...",
    "freightSettlementHash": "...",
    "chainRootSha256": "..."
  },
  "evidence": {
    "paymentSnapshot": {
      "pricingVersion": "...",
      "sourceRecordId": "...",
      "hashField": "pricingSnapshotHash"
    },
    "exportManifest": {
      "sourceRecordId": "...",
      "manifestPath": "...",
      "recomputedManifestHash": "...",
      "storedManifestHash": "..."
    },
    "freightSettlement": {
      "sourceRecordId": "...",
      "settlementVersion": "...",
      "storedSettlementHash": "...",
      "recomputedSettlementHash": "..."
    }
  },
  "computedAt": "ISO-8601 UTC"
}
```

### 7.2 Evidence Determinism Requirements

- Same underlying artefacts must produce identical output, except computedAt timestamp.
- Hash recomputation must read raw manifest bytes and canonical settlement JSON.

### 7.3 Evidence Storage (Design only)

Evidence output may be:
- returned on demand (preferred for design-lock)
- optionally persisted as an immutable “IntegrityChainEvidence” artefact in a future authorized phase

No persistence requirement is authorized here.

## 8. Explicit Non-Authorization Statement

This schema design does not authorize:
- enforcement holds
- payout gating
- payment failure actions
- escrow release modification
- automated freezes
- retroactive record edits

It defines linkage and verifiability only.

## 9. Acceptance Criteria for Schema Pack Lock

This schema design pack is considered lock-ready when:
- Canonical settlement JSON definition is explicit and deterministic
- Write-once field rules are unambiguous
- Indexes and query patterns are defined
- Backfill policy prohibits history rewrite
- Verification evidence output is defined

## 10. Next Governance Steps

After locking this schema design pack:
- Draft GOV-CHAIN-01 aggregator rule skeleton (static checks only)
- Draft invariant test scaffolding requirements
- Draft EXT-CHAIN-INTEGRITY-01 Close Pack outline (design-lock phase)

Runtime authorization remains out of scope until board-ratified enforcement phase.
