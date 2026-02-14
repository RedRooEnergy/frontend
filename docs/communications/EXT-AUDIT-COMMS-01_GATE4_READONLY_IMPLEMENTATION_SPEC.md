# EXT-AUDIT-COMMS-01 — Gate 4 Read-only Implementation Specification
Version: v1.0
Status: GATE 4 IMPLEMENTATION SPEC (READ-ONLY)
Runtime Impact: NONE (spec only)
Build Authorization: NOT GRANTED
Change Control: REQUIRED

## 1) Gate 4 Objective
Define a concrete, read-only implementation specification for unified evidence views and evidence-pack exports (Email + WeChat) that can be executed later without changing Gate 1-3 doctrines.

This document is an implementation specification but does not authorize implementation.

## 2) Hard Constraints (Non-negotiable)
- No mutation surfaces (`send`, `retry`, `resend`, `acknowledge`, `resolve`).
- No unified mutable datastore.
- No rewriting or normalization of channel history.
- No evidence-row dropping or deduplication by deletion.
- No synthetic authority events.
- `CompositeEvidenceHash` must remain recomputable with scope and completeness labeling.
- Admin and Regulator slice separation must remain intact.
- Cross-channel chronology must never imply authority precedence.
- No raw secrets, tokens, or direct personal identifiers may be exposed.

## 3) Concrete Interface Categories (Read-only)
No route paths or endpoint names are defined in this gate.

### A) Unified Evidence View Interface
Inputs:
- Correlation selector (`orderId` | `shipmentId` | `paymentId` | `complianceCaseId` | `governanceCaseId`)
- Slice type (`ADMIN` | `REGULATOR`)
- Allowed filters (time window, channel subset, derived status subset)

Outputs:
- Deterministically ordered evidence rows
- `perChannelHashSummary`
- `compositeEvidenceHash`
- `scopeLabel`
- `completenessLabel`
- `cacheAge`

Error and validity conditions:
- Missing correlation input -> invalid request condition
- Partial channel evidence -> `completenessLabel=PARTIAL`
- Unavailable channel evidence -> `completenessLabel=UNKNOWN`
- Stale derived output -> stale warning label required

### B) Evidence Pack Export Interface
Inputs:
- Same selection model as Unified Evidence View
- Slice type
- Allowed filters

Outputs:
- Export metadata (`generatedAt`, `scopeLabel`, `completenessLabel`, `cacheAge`)
- `compositeEvidenceHash`
- `perChannelHashSummary`
- Export evidence rows (slice-scoped)
- `manifest.json` with SHA-256 for each included artifact
- `manifestHash`

Error and validity conditions:
- Incomplete export set must still include deterministic scope and completeness labels
- Missing source evidence must produce labeled partial/unknown output, never silent omission

### C) Composite Hash Verification Interface
Inputs:
- Evidence rows for a declared scope
- Scope label
- Slice type

Outputs:
- Recomputed `compositeEvidenceHash`
- Comparison status (`MATCH` | `MISMATCH`)
- Deterministic verification metadata (`scopeLabel`, `completenessLabel`, `verifiedAt`)

Error and validity conditions:
- Verification cannot proceed without deterministic scope label
- Missing required hash fields yields labeled verification failure

## 4) Explicit Data Contracts
### A) `UnifiedEvidenceRow` contract
- `correlationKey`: object with `{ keyType, keyValue }`
- `channelName`: `EMAIL` | `WECHAT`
- `dispatchId`: string
- `createdAt`: ISO-8601 UTC timestamp
- `payloadHash`: SHA-256 hex string
- `statusProgressionHash`: SHA-256 hex string or placeholder token
- `statusSummary`: derived non-sensitive status value
- `completenessContribution`: `FULL` | `PARTIAL` | `UNKNOWN`
- `redactionLevel`: `REGULATOR` | `ADMIN`

### B) `ViewResponse` contract
- `generatedAt`: ISO-8601 UTC timestamp
- `cacheAge`: integer duration value in declared unit
- `scopeLabel`: deterministic canonical filter description
- `completenessLabel`: `FULL` | `PARTIAL` | `UNKNOWN`
- `compositeEvidenceHash`: SHA-256 hex string
- `channelEvidence`: array of `UnifiedEvidenceRow`
- `perChannelHashSummary`: deterministic ordered list

### C) `ExportPack` contract
- Includes all `ViewResponse` metadata and hash fields
- Includes exported `channelEvidence` rows (slice-scoped)
- Includes `manifest.json` listing each artifact + SHA-256
- Includes `manifestHash` (SHA-256 of manifest artifact)
- Includes explicit export `scopeLabel` and `completenessLabel`

## 5) Deterministic Ordering and Sorting
Stable sort keys (in order):
1. `correlationKey.keyType + ":" + correlationKey.keyValue`
2. `channelName`
3. `createdAt`
4. `dispatchId`

Canonical channel ordering is lexicographic and locked:
- `EMAIL`
- `WECHAT`

## 6) Hash Computation Specification
Canonical row input fragment:
- `channelName|dispatchId|payloadHash|statusProgressionHash`

Hash construction rules:
- Encoding: UTF-8
- `channelName` normalized to lower-case before concatenation
- Delimiter: pipe (`|`)
- Missing `statusProgressionHash` uses placeholder token: `__MISSING_STATUS_HASH__`
- Any placeholder usage forces `completenessLabel` to at least `PARTIAL`

Scope hashing rule (locked):
- `scopeLabel` is included in `CompositeEvidenceHash` input to prevent cross-scope ambiguity.

Composite hash conceptual input:
- `scopeLabel + "||" + join(sorted(rowFragments), "\\n")`

## 7) Filter and Scope Policy
Allowed filters (read-only):
- Time-range filter on `createdAt`
- Channel filter (`EMAIL`, `WECHAT`)
- Derived status filter (`DELIVERED`, `FAILED`, etc.; non-authoritative)

Forbidden filters:
- `userId`-only filters
- Any filter equivalent to “hide failed rows"
- Any filter that drops rows without scope recomputation and relabeling

Policy requirement:
- Any applied filter must produce deterministic `scopeLabel` and recomputed `compositeEvidenceHash`.

## 8) Slice Enforcement Specification
### Regulator slice must exclude
- Raw message bodies
- Template contents
- Unmasked identity fields
- Raw provider payloads
- Secrets/tokens/credentials

### Admin slice may include
- Redacted provider error codes
- Delivery status progression summary
- Completeness diagnostics

Both slices remain read-only and non-authoritative.

## 9) Cache and Staleness Label Rules
Behavioral labeling contract:
- `cacheAge` is mandatory and must be reported as duration
- `staleThreshold` concept is mandatory for validity labeling
- If `cacheAge > staleThreshold`, response must include stale warning label (`STALE`)
- Stale labeling does not authorize or imply mutation/backfill behavior

No caching technology is specified in this gate.

## 10) Export Pack Assembly Specification
Export artifacts required:
- JSON view export (slice-scoped)
- Optional summary artifact (if included, must remain hash-consistent and non-authoritative)
- `manifest.json` with SHA-256 per included artifact
- `manifestHash`

Assembly constraints:
- Export generation is read-only
- Export generation must not backfill or mutate channel ledgers
- Export metadata must include `scopeLabel` and `completenessLabel`

## 11) Governance Audit Verification Plan (Specification-level)
Verification categories:
- Determinism verification: identical input -> identical `compositeEvidenceHash`
- Slice compliance verification: regulator output excludes prohibited fields
- Completeness labeling verification: `FULL/PARTIAL/UNKNOWN` rules correct
- Hash recomputation verification: scope and row inputs reproduce displayed hash
- Export manifest integrity verification: artifact hashes match manifest entries
- Prohibited pattern scan verification: no mutation interfaces in spec surface

## 12) Objective Gate 4 Exit Criteria
PASS:
- Interface categories fully specified without route or endpoint naming
- Data contracts fully enumerated (`UnifiedEvidenceRow`, `ViewResponse`, `ExportPack`)
- Hash computation and scope labeling rules are deterministic and locked
- Slice suppression rules are explicit and complete
- Filter policy is explicit with allowed/forbidden filters
- Cache/staleness behavioral labeling rules are defined
- Governance audit verification plan is defined
- No mutation surfaces appear anywhere in spec
- No authority drift language appears

FAIL:
- Any route path or endpoint naming appears
- Any schema/index/storage design detail appears
- Any UI layout/component/page design appears
- Any mutation behavior is allowed
- Any unified view authority semantics are introduced
- Hash/scope/completeness doctrine is weakened or removed

## 13) Gate 5 Preview
If authorized under formal change control, Gate 5 may define a bounded build plan (tasks and sequencing) for a strictly read-only implementation surface, while preserving all Gate 1-4 non-mutation, deterministic hash, scope-label, completeness-label, and slice-separation constraints.
