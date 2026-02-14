# EXT-AUDIT-COMMS-01 — Gate 2 Implementation Contract Boundaries
Version: v1.0
Status: GATE 2 DESIGN LOCK
Runtime Impact: NONE
Build Authorization: NOT GRANTED
Change Control: REQUIRED

## 1) Gate 2 Objective
Define the implementation contract boundaries for the unified cross-channel evidence dashboard (Email + WeChat), while preserving Gate 1 read-only doctrine and deterministic hash integrity.

Gate 2 may define contracts only (data shapes, read-only endpoint categories, export formats, RBAC slice rules), and may not define code, schemas, UI components, or operational procedures.

Bounded by:
- EXT-COMMS-01 (`docs/communications/COMMUNICATIONS_CONTROL_PLANE.md`)
- EXT-AUDIT-COMMS-01 Governance Charter (`docs/communications/EXT-AUDIT-COMMS-01_GOVERNANCE.md`)
- EXT-AUDIT-COMMS-01 Gate 1 Read-only Dashboard Spec (`docs/communications/EXT-AUDIT-COMMS-01_GATE1_READONLY_DASHBOARD_SPEC.md`)

## 2) Allowed Contract Surface (Explicit)
Gate 2 is permitted to define only the following at conceptual interface-contract level.

### A) Read-only query surfaces (contract only)
- A minimal set of read-only views that return unified evidence by correlation ID.
- All query surfaces must be defined as read-only, derived, and recomputable.

### B) Read-only export surfaces (contract only)
- Evidence pack export contract with manifest, hashes, scope label, and generation timestamp.
- Export format and required field contracts.

### C) Canonical data shapes (contract only)
- `UnifiedEvidenceRow` contract:
  - `channelName`
  - `dispatchId`
  - `createdAt`
  - `payloadHash`
  - `progressionHash`
  - `correlationRefs`
  - `statusSummary`
- Slice-specific contract deltas (Admin vs Regulator).

### D) RBAC slice separation contract (concept only)
- Explicit field-level contracts for Admin slice and Regulator slice.
- Required masking and redaction rules.
- No write verbs and no workflow actions.

### E) Deterministic composite hash computation contract (concept only)
- Required hash inputs.
- Required deterministic sorting rules.
- Required scope-label rules.
- Required filter recomputation rules.

### F) Error and validity labeling contract (concept only)
- Incomplete evidence must expose completeness labels.
- Cached-derived outputs must expose cache age and hash scope labels.

## 3) Forbidden Contract Surface (Hard Prohibitions)
Gate 2 must not include:
- Any mutation surface (`send`, `retry`, `resend`, `acknowledge`, `resolve`).
- Any change to Email or WeChat ledgers.
- Any new mutable unified evidence datastore.
- Any UI layout, component, or page specification.
- Any database schema definition or index plan.
- Any route path naming, code file path, or framework-specific implementation detail.
- Any background job, scheduler, or event-listener design.
- Any operator workflow instruction (runbooks are out of scope for this gate).

If any prohibited surface appears, Gate 2 fails.

## 4) Regulator vs Admin Slice Contracts
Define explicit field-level contracts.

### A) Regulator Slice (hash-first, minimal)
Must include:
- `CompositeEvidenceHash` with scope label
- Correlation identifiers (masked where required)
- Per-channel `payloadHash` and `progressionHash`
- Per-channel `dispatchId` and `createdAt`
- Non-sensitive `statusSummary`

Must exclude:
- Raw message bodies by default
- Template contents
- Direct personal identifiers
- Provider responses containing secrets or tokens
- Free-text internal notes

### B) Admin Slice (maximum visibility, still read-only)
Must include:
- All Regulator-slice fields
- Redacted provider error codes
- Delivery-status progression summaries
- Completeness flags for missing ledger data indicators

Must exclude:
- Any mutation controls
- Any case-resolution persistence unless routed to a separate core case system (out of scope for EXT-AUDIT-COMMS-01)

## 5) Hash/Recomputation Rules (Gate 2 Contract)
Gate 2 must reaffirm and operationalize Gate 1 hash doctrine in contract form.

- `CompositeEvidenceHash` must be recomputable from channel ledgers for identical slice and filter scope.
- Any filter applied must:
  - Recompute `CompositeEvidenceHash` for filtered scope
  - Include a deterministic scope label describing filter conditions
- Ordering must be deterministic:
  - Primary: `correlationId + channelName`
  - Secondary: `createdAt`
  - Tertiary: `dispatchId`
- Completeness labels must be present:
  - `FULL`: all expected channel evidence available
  - `PARTIAL`: missing channel evidence or progression
  - `UNKNOWN`: channel data unavailable

No hash may be displayed without both scope label and completeness label.

## 6) Evidence Pack Export Contract (Gate 2)
Export contract requirements:
- View metadata: `generatedAt`, scope label, completeness label
- `CompositeEvidenceHash`
- Per-channel hash list
- Evidence rows as defined by slice contract
- Manifest containing SHA-256 hashes of each included artifact

Export must never include:
- Secrets
- Raw provider tokens
- Uncontrolled raw free-text bodies in Regulator export by default

Export remains read-only derived output and must not backfill into channel stores.

## 7) Objective Gate 2 Exit Criteria
Gate 2 is accepted only if all PASS criteria are met and no FAIL criteria occur.

PASS:
- Allowed and forbidden boundaries are explicit and internally consistent.
- Admin and Regulator slice field lists are explicitly enumerated.
- Deterministic composite hash and ordering contracts are fully specified.
- Filter scope labeling and recomputation rules are explicitly specified.
- Completeness and validity labeling contract is specified.
- Evidence pack export contract is specified (manifest + hashes + scope label + timestamp).
- All language remains design-only (no runtime paths, schema, UI, or code).

FAIL:
- Any mutation surface is described (`send`, `retry`, `resend`, `ack`, `resolve`).
- Any runtime endpoint, route name, or code/framework-specific detail appears.
- Any database schema, index, or storage design appears.
- Any UI component or page design appears.
- Any statement implies build authorization.

## 8) Gate 3 Preview
If authorized under change control, Gate 3 may define concrete implementation planning contracts (read paths, cache posture, placement contracts, and governance audit checks) while remaining strictly read-only and non-mutating.
