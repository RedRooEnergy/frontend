# EXT-AUDIT-COMMS-01 — Gate 3 Read-only Implementation Planning Contract
Version: v1.0
Status: GATE 3 DESIGN LOCK
Runtime Impact: NONE
Build Authorization: NOT GRANTED
Change Control: REQUIRED

## 1) Objective
Define the implementation planning contract for a unified, read-only cross-channel evidence dashboard and export surface (Email + WeChat), while preserving Gate 1 and Gate 2 doctrines.

Gate 3 is planning-contract only:
- Actionable for later implementation planning
- Non-mutating by definition
- Non-authorizing for runtime build

Bounded by:
- EXT-COMMS-01 (`docs/communications/COMMUNICATIONS_CONTROL_PLANE.md`)
- EXT-AUDIT-COMMS-01 Governance Charter (`docs/communications/EXT-AUDIT-COMMS-01_GOVERNANCE.md`)
- EXT-AUDIT-COMMS-01 Gate 1 (`docs/communications/EXT-AUDIT-COMMS-01_GATE1_READONLY_DASHBOARD_SPEC.md`)
- EXT-AUDIT-COMMS-01 Gate 2 (`docs/communications/EXT-AUDIT-COMMS-01_GATE2_IMPLEMENTATION_CONTRACT_BOUNDARIES.md`)

## 2) Planning Work Packages (Concept-only)
Gate 3 may define conceptual work-package boundaries only.

### A) Evidence Source Adapters
- Email evidence adapter (read-only)
- WeChat evidence adapter (read-only)
- Responsibility: surface channel-native evidence fields required for deterministic convergence

### B) Evidence Normalizer
- Responsibility: derive unified evidence rows from channel-native read results
- Constraint: derived view only; no persistence; no mutation

### C) Composite Hash Calculator
- Responsibility: deterministic composite hash computation across normalized rows
- Constraint: hash must remain recomputable for identical scope and filters

### D) Slice Renderer (Admin / Regulator)
- Responsibility: enforce slice-specific field visibility and redaction contracts
- Constraint: no write controls; no workflow actions

### E) Export Pack Assembler
- Responsibility: produce read-only evidence pack with manifest, hashes, scope, and generation metadata
- Constraint: no backfill, no channel-store mutation

## 3) Read-path Dependency Map
| Dependency Concept | Required Inputs | Purpose | Constraint |
| --- | --- | --- | --- |
| Email Evidence Ledger | `dispatchId`, `createdAt`, `payloadHash`, `statusProgressionHash`, `correlationRefs` | Channel evidence contribution | Read-only access only |
| WeChat Evidence Ledger | `dispatchId`, `createdAt`, `payloadHash`, `statusProgressionHash`, `correlationRefs` | Channel evidence contribution | Read-only access only |
| Cross-channel Correlation Pivot | `orderId` / `shipmentId` / `paymentId` / `complianceCaseId` / `governanceCaseId` | Deterministic convergence keying | No user-only aggregation |

## 4) Cache Posture Contract (Concept-only)
Any derived or cached output must carry labels:
- `cacheAge`
- `scopeLabel`
- `completenessLabel`

Additional contract requirements:
- Stale-hash warning label required when derived output age exceeds declared freshness policy.
- Hash values must never be displayed without scope and completeness labels.
- Cache posture remains descriptive only; this gate does not authorize caching implementation mechanics.

## 5) Governance Audit Test Categories (Concept-only)
Gate 3 may define audit categories only:
- Determinism verification
- Slice redaction verification
- Hash recomputation verification
- Completeness labeling verification
- Export manifest verification
- Prohibited-pattern scan verification

No test implementation details are authorized in this gate.

## 6) Non-Regression Boundaries
The following boundaries must remain intact for any later build phase:
- No mutation surfaces (`send`, `retry`, `resend`, `acknowledge`, `resolve`)
- No unified mutable datastore
- No evidence-row dropping as deduplication behavior
- No synthetic authority events
- Mandatory hash scope labeling
- Admin/Regulator slice field-list changes require formal change control

## 7) Objective Gate 3 Exit Criteria
PASS:
- Conceptual work packages are defined without runtime leakage.
- Read-path input contract coverage for Email and WeChat is complete.
- Hash/scope/completeness labeling contract is reaffirmed and internally consistent.
- Governance audit test categories are enumerated.
- Export assembly contract is clarified as read-only and non-backfilling.
- Non-regression boundaries are explicit and complete.

FAIL:
- Any route path or endpoint naming appears.
- Any schema, index, or storage implementation detail appears.
- Any UI layout/component/page detail appears.
- Any mutation verb appears in allowed behavior.
- Any statement implies runtime authorization.
- Any dilution of deterministic hash doctrine or slice separation appears.

## 8) Gate 4 Preview
If authorized under formal change control, Gate 4 may define concrete implementation specifics for a strictly read-only build surface (including technical interface details and audit validations) while preserving all Gate 1-3 non-mutation and deterministic evidence constraints.
