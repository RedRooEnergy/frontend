# Communications Control Plane
Version: v1.0
Status: DESIGN LOCK (no runtime impact)
Extension: EXT-COMMS-01

## 1) Objective
Define a unified governance model for all communication channels without introducing a universal chat runtime abstraction.

Core invariant:
- Core platform ledgers remain the sole state-authoritative system.
- Channels are notification and evidence surfaces only.

## 2) Channel Classes
| Channel | Scope | Authority Level |
| --- | --- | --- |
| Email | Transactional, operational, compliance notices | Evidence-bearing notification |
| WeChat | Event-bound supplier communication | Evidence-bearing notification |
| Internal Platform Messaging (future) | Governed in-platform collaboration | Evidence-bearing notification (until separately authorized) |
| Marketing outbound | Campaign communication | Notification-only (not evidence-authoritative) |

State-authoritative messaging is prohibited across all channels.

## 3) Authority Boundaries
### 3.1 Notification-only channels
- Marketing outbound.
- Never allowed to assert completion, approval, settlement, or compliance outcomes.

### 3.2 Evidence-bearing channels
- Email, WeChat, future internal governed messaging.
- Must carry deterministic correlation identifiers and append-only evidence records.
- May reference required actions but cannot execute state transitions.

### 3.3 Platform-authoritative actions
- Order/compliance/freight/payment/governance state transitions occur only via authenticated platform routes and immutable platform ledgers.

## 4) Evidence Model by Channel
| Channel | Hash Required | Append-only Record | Retention Class | Regulator Visible |
| --- | --- | --- | --- | --- |
| Email | Yes | Yes | 7Y (operational classes) | Yes (redacted payload where required) |
| WeChat | Yes | Yes | 7Y (operational classes) | Yes (metadata/hash-first; transcript minimized) |
| Internal Messaging (future) | Yes (mandatory at launch) | Yes | 7Y default (subject to legal classing) | Yes (governance export mode) |
| Marketing | Optional campaign hash manifest | Campaign logs append-only | Policy-defined marketing retention | Limited, by campaign/compliance requirement |

## 5) Event Ownership Matrix
| Domain Event | Primary Channel | Secondary Channel | Owner |
| --- | --- | --- | --- |
| Order lifecycle events | Email + WeChat (supplier) | Internal admin escalation | Orders domain |
| Compliance prompts/status | Email + WeChat (supplier) | Internal compliance queue | Compliance domain |
| Freight milestones/exceptions | Email + WeChat (supplier/admin) | Internal freight queue | Freight domain |
| Payment status prompts | Email (primary) + WeChat (bounded) | Internal finance queue | Payments domain |
| Governance/account notices | Email + WeChat (bounded) | Internal governance queue | Governance domain |

All cross-channel sends must share correlation IDs (`orderId`, `shipmentId`, `paymentId`, `complianceCaseId`, or approved governance case ID).

## 6) Escalation and Fallback Rules
Canonical escalation sequence:
1. Primary channel dispatch.
2. Secondary channel dispatch on timeout/failure.
3. Internal admin queue case creation.
4. Manual operator escalation path.

Example:
- Payment action timeout -> Email prompt -> WeChat prompt -> Internal finance escalation -> Admin queue.

Escalation events must be idempotent and append-only with shared correlation IDs.

## 7) Regulator Exposure Surface
- Regulator exposure is read-only.
- Expose deterministic hashes, event codes, dispatch metadata, and delivery outcomes.
- Do not expose free-form personal chat transcripts by default.
- Any transcript export requires legal basis and explicit disclosure path.

## 8) Prohibited Patterns
- Free-form admin broadcast endpoints.
- External message text directly mutating platform state.
- Cross-channel duplicate sends without shared correlation ID.
- Dispatch records without deterministic payload hash.
- Unbounded fan-out routing bypassing event taxonomy.
- Universal chat abstraction that blurs authority boundaries.

## 9) Design Constraints
- No runtime behavior changes are introduced by EXT-COMMS-01.
- This artefact defines governance contracts only.
- Runtime implementation requires separate extension change control and phase approval.

