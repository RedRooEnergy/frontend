# EXT-AUDIT-COMMS-01 Governance Charter
Version: v1.0
Status: DESIGN LOCK
Runtime Impact: NONE
Build Authorization: NOT GRANTED
Change Control: REQUIRED to authorize any build phase

## 1) Purpose
Define a unified, regulator-first cross-channel evidence view for operational communications.

This extension is:
- Read-only aggregation governance
- Not a new source of truth
- Not a mutable evidence store
- Not a mutation surface for channel or domain state

Bounded by:
- EXT-COMMS-01 (`docs/communications/COMMUNICATIONS_CONTROL_PLANE.md`)

## 2) Authority Boundary
Unified evidence is evidence-bearing and non-state-authoritative.

No dashboard or aggregation output may directly mutate:
- Orders
- Compliance
- Freight
- Payments
- Governance state

Platform state authority remains in core domain workflows only.

## 3) Channel Inclusion Model
Included:
- Email evidence ledgers
- WeChat evidence ledgers

Reserved (future, no runtime in this extension phase):
- Internal Messaging evidence ledger (EXT-INTERNAL-MSG-01)

Excluded from operational evidence authority:
- Marketing outbound channel records

## 4) Correlation Model
Allowed correlation pivots:
- `orderId`
- `shipmentId`
- `paymentId`
- `complianceCaseId`
- `governanceCaseId`

Explicitly prohibited:
- User-only aggregation without domain correlation IDs
- Cross-channel joins that drop original channel correlation context

## 5) Deterministic Composite Hash Contract
The cross-channel view must remain independently verifiable via a deterministic composite hash contract over channel-native evidence artifacts.

Conceptual contract:
`CompositeEvidenceHash = SHA256(sorted(channelName + dispatchId + payloadHash + statusProgressionHash))`

Requirements:
- Channel ledgers remain append-only and authoritative
- Aggregation never rewrites channel artifacts
- Recomputed hashes must match for identical slices

## 6) Temporal Ordering Rules
- Display order follows channel dispatch `createdAt`
- Status order follows channel append-only progression
- Cross-channel chronology does not imply authority precedence

## 7) Regulator Exposure Model
Regulator slice is read-only and hash-first:
- Composite hash
- Per-channel hashes
- Correlation references
- Redacted provider/error context only as permitted

No secret material exposure.
No raw transcript exposure by default without explicit legal basis.

## 8) Prohibited Patterns
- New mutable "unified evidence" collection
- Rewriting or normalizing historical channel records
- Dropping evidence rows as "dedupe"
- Synthetic consolidated events as authoritative records
- Hash output without clear scope labeling

## 9) Future Integration Constraint
When EXT-INTERNAL-MSG-01 is authorized for runtime build, it must integrate into this extension under the same deterministic composite hash contract and read-only aggregation doctrine.

## 10) Lifecycle and Change Control
Current lifecycle state: DESIGN LOCK.

Any runtime implementation (routes, storage, UI, background jobs) requires:
- Formal build-phase authorization
- Objective gate acceptance criteria
- Registry update under change control
