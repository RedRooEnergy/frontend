# EXT-AUDIT-COMMS-01 — Gate 5 Bounded Build Plan (Read-only)
Version: v1.0
Status: GATE 5 BUILD PLAN (READ-ONLY)
Runtime Impact: NONE (plan only)
Build Authorization: GRANTED for read-only build scope only
Change Control: REQUIRED for any boundary expansion

## 1) Gate 5 Objective (Build Authorization Statement)
Authorize only the bounded, read-only build scope for:
- Unified evidence dashboard (Email + WeChat)
- Evidence pack export (read-only)
- Hash verification output (read-only)

Explicit exclusions:
- Any `send` / `retry` / `resend` functions
- Any case acknowledgment or resolution persistence
- Any mutation of Email or WeChat ledgers
- Any unified mutable datastore

This gate authorizes bounded build planning and execution sequencing for read-only capabilities only.

## 2) Locked Non-Regression Constraints (Binding from Gates 1-4)
The following constraints remain binding and cannot be altered by build work:
- No mutation surfaces (`send`, `retry`, `resend`, `acknowledge`, `resolve`)
- No unified mutable store
- No rewriting or normalization of channel history
- No evidence-row dropping/deduplication by deletion
- No synthetic authority events
- `CompositeEvidenceHash` must remain recomputable with deterministic scope and completeness labeling
- Admin vs Regulator slice separation is mandatory
- Cross-channel chronology does not imply authority precedence
- No raw secrets, tokens, or direct personal identifiers in exposed outputs

## 3) Bounded Work Breakdown Structure (WBS)
### Phase 0 — Preflight and Governance Checks
Tasks:
- Confirm Gate 1-4 artifacts exist and are registry-visible
- Confirm lifecycle notes are up to date
- Confirm governance audit categories are defined

Acceptance:
- Governance artifacts and lifecycle references are complete and consistent
- No scope drift detected before build execution

### Phase 1 — Read-only Evidence Source Adapters
Tasks:
- Implement read-only Email evidence field extraction
- Implement read-only WeChat evidence field extraction
- Implement correlation pivot mapping across allowed correlation keys

Acceptance:
- Source adapters return required fields only
- No writes occur in adapter paths

### Phase 2 — Normalizer and Deterministic Sorting
Tasks:
- Implement `UnifiedEvidenceRow` derivation from source adapters
- Enforce deterministic ordering keys and channel ordering

Acceptance:
- Identical inputs produce identical row ordering
- No mutation side effects

### Phase 3 — Composite Hash and Scope/Completeness
Tasks:
- Implement composite hash generation including scope label inclusion
- Implement completeness labeling (`FULL` / `PARTIAL` / `UNKNOWN`)
- Implement placeholder handling for missing `statusProgressionHash`

Acceptance:
- Deterministic hash for identical inputs
- Partial data correctly labeled and reflected in hash context

### Phase 4 — Slice Enforcement
Tasks:
- Implement regulator slice suppression rules
- Implement admin slice extended read-only visibility
- Implement masking and redaction rules

Acceptance:
- Regulator slice never includes excluded fields
- Admin slice remains read-only and compliant

### Phase 5 — Evidence Pack Export
Tasks:
- Implement export metadata (`generatedAt`, `scopeLabel`, `completenessLabel`, `cacheAge`)
- Implement artifact manifest and `manifestHash`
- Ensure export remains read-only derived output

Acceptance:
- Export hashes match included artifacts
- Export reproducible for identical inputs
- No channel ledger backfill/mutation

### Phase 6 — Verification Surface
Tasks:
- Implement read-only hash verification output (`MATCH` / `MISMATCH`)

Acceptance:
- Verification reliably detects mismatch conditions
- Verification output remains read-only and non-authoritative

### Phase 7 — Governance Audit Tests
Tasks:
- Determinism test coverage
- Slice compliance test coverage
- Export manifest integrity test coverage
- Prohibited-pattern scan coverage (no mutation interfaces)

Acceptance:
- All governance tests pass
- Scan confirms no mutation surfaces in implementation scope

### Phase 8 — Staging Rollout Checklist (Read-only)
Tasks:
- Enable read-only feature flags for staging view surfaces
- Validate partial/unknown labeling behavior
- Validate stale labels where cache behavior is present

Acceptance:
- Staging checklist signed
- No mutation semantics observed

## 4) Explicit Not in Scope (Blocklist)
- Any mutating channel operation (`send`, `retry`, `resend`)
- Any acknowledgment/resolution persistence within dashboard context
- Any write path against Email/WeChat ledgers
- Any unified mutable evidence persistence layer
- Any authority transfer from platform workflows to dashboard outputs
- Any additional channel onboarding (including Internal Messaging) in this gate

## 5) Verification Matrix (PASS/FAIL)
| Control Area | Verification Requirement | PASS Condition | FAIL Condition |
| --- | --- | --- | --- |
| Source adapters | Read-only extraction only | Required fields returned; no writes | Any write/mutation path exists |
| Deterministic ordering | Stable row ordering | Identical input => identical order | Order drift for identical input |
| Composite hash | Deterministic and scope-bound | Identical input/scope => identical hash | Hash drift or missing scope label |
| Completeness labeling | FULL/PARTIAL/UNKNOWN accuracy | Labeling matches source availability | Missing or incorrect completeness labels |
| Slice enforcement | Regulator suppression | Excluded fields never appear in regulator slice | Any excluded field appears |
| Export manifest | Artifact/hash integrity | Manifest hashes match exported artifacts | Hash mismatch or missing manifest entries |
| Prohibited pattern scan | No mutation interfaces | No mutation verbs/interfaces detected | Mutation interfaces detected |
| Authority boundary | Non-authoritative view | No state mutation semantics present | Any authoritative or mutating behavior implied |

## 6) Exit Criteria for Gate 5 Completion
All criteria are required:
- All WBS phases complete
- Verification matrix PASS across all rows
- Regulator slice suppression confirmed
- Composite hash determinism confirmed
- Export manifest integrity confirmed
- No mutation surfaces detected
- No authority drift language or behavior detected

## 7) Change Control Trigger Conditions
Any of the following requires formal governance reopening:
- Request for mutation controls
- Request for unified evidence persistence store
- Request to expose raw message bodies to regulator slice
- Request to add new channels (including Internal Messaging)
- Request to alter deterministic hash/scope/completeness doctrine
- Request to alter Admin/Regulator slice boundaries

## 8) Governance Assurance Statement
This build plan is bounded to read-only implementation scope and inherits all non-regression obligations from Gates 1-4. Any boundary expansion is prohibited without formal change control.
