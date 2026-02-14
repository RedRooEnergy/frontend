# EXT-AUDIT-COMMS-01 Governance Charter
Version: v1.0
Status: GATE 1 DESIGN LOCK
Runtime Impact: NONE
Build Authorization: NOT GRANTED
Change Control: REQUIRED to authorize build phase

## 1) Gate 1 Objective
Define a regulator-safe, admin-usable, read-only unified evidence dashboard that converges Email and WeChat evidence by domain correlation ID and exposes deterministic composite hash contracts.

This dashboard is:
- A read-only aggregation layer
- Not a new source of truth
- Not a new storage layer
- Not a mutation surface

Bounded by:
- EXT-COMMS-01 (`docs/communications/COMMUNICATIONS_CONTROL_PLANE.md`)

## 2) Scope Boundaries (Non-Mutating)
Explicitly allowed:
- Read-only query and aggregation
- Derived evidence views
- Deterministic hash computation for display
- Read-only export generation (evidence pack)

Explicitly forbidden:
- Any state transition or workflow mutation
- Any channel record mutation
- Any `send`, `retry`, or `resend` action
- Any persisted `mark resolved` / `acknowledged` behavior in this gate

## 3) Channel Inclusion Matrix
| Channel | Evidence Class | Included | Excluded |
| --- | --- | --- | --- |
| Email | Evidence-bearing operational communication | Yes | No |
| WeChat | Evidence-bearing operational communication | Yes | No |
| Internal Messaging (future) | Evidence-bearing internal communication | Reserved (future) | Current gate implementation |
| Marketing outbound | Campaign communication | No (operational evidence view) | Yes |

Marketing remains separately classified and excluded from operational evidence convergence.

## 4) Correlation Model
Aggregation pivot keys:
- `orderId`
- `shipmentId`
- `paymentId`
- `complianceCaseId`
- `governanceCaseId`

Explicitly prohibited:
- Aggregation by `userId` alone
- Aggregation without at least one domain correlation ID

## 5) Deterministic Aggregation Contract
Required inputs:
- Email evidence records
- WeChat dispatch records and status progression records

Required outputs:
- `CompositeEvidenceHash`
- Per-channel hash list
- Deterministically sorted evidence rows

Deterministic ordering rules:
- Primary: `correlationId + channelName`
- Secondary: `dispatch.createdAt`
- Tertiary: `dispatchId`

## 6) Slice Separation (Admin vs Regulator)
Admin slice (read-only):
- Maximum operational visibility without mutation controls
- Delivery failure counts and provider error codes (redacted)
- Correlation-linked multi-channel evidence rows

Regulator slice (read-only):
- Hash-first representation
- Minimum necessary fields only
- PII masked
- No templates and no raw bodies unless separately authorized

## 7) Hash-Chain Consistency Rules
- Composite hash must match recomputation from underlying append-only channel ledgers.
- Any view-level filtering must recompute hash and label filter scope explicitly.
- Evidence exports must include manifest hash and generation timestamp.
- Unified dashboard must never mutate or rewrite channel evidence records.

Conceptual formula:
`CompositeEvidenceHash = SHA256(sorted(channelName + dispatchId + payloadHash + statusProgressionHash))`

## 8) Temporal Ordering Rules
- Display ordering follows channel dispatch `createdAt`.
- Status progression ordering remains append-only within each channel ledger.
- Cross-channel order does not imply authority precedence.

## 9) Prohibited Runtime Patterns
- Creating a new mutable unified evidence collection
- Rewriting or normalizing historical channel evidence
- Deduplicating by dropping evidence rows
- Combining multiple dispatches into a single evidence node
- Returning stale cached hashes without validity labeling
- Generating synthetic consolidated events as authoritative records

## 10) Exit Criteria (Before Any Build Authorization)
PASS criteria:
- Evidence field mapping defined for Email and WeChat
- Deterministic ordering and hash contract defined with examples
- Admin vs Regulator slice fields enumerated
- Export pack contents defined (manifest + hashes)
- Prohibited patterns list complete
- Mutation feature change control statement explicit
- Security/privacy constraints explicit (masking and redaction rules)

FAIL criteria:
- Any runtime endpoint, schema, or UI definition appears
- Any mutation action control appears (`send`, `retry`, `acknowledge`, `resolve`)
- Any authority drift appears between channel evidence and platform state authority

## 11) Gate 2 Preview
Gate 2 may define implementation contracts (routes, UI, and schema) only after Gate 1 is accepted under formal change control; this document does not grant runtime authorization.
