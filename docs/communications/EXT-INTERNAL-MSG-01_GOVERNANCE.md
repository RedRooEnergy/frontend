# EXT-INTERNAL-MSG-01 Governance Charter
Version: v1.0
Status: DESIGN LOCK
Runtime Impact: NONE
Change Control: REQUIRED to authorize build phase

## 1) Purpose
Define Internal Messaging as a governed in-platform collaboration channel that is evidence-bearing, non-state-authoritative, and bounded by EXT-COMMS-01.

No internal message shall directly mutate order, compliance, freight, payment, or governance state.

Reference:
- docs/communications/COMMUNICATIONS_CONTROL_PLANE.md (EXT-COMMS-01)

Channel position:
- Internal Messaging is an evidence-bearing channel under the Communications Control Plane, equivalent class to Email and WeChat (but fully internal), not a universal abstraction.

## 2) Authority Model
Internal Messaging is:
- Notification-only for operational prompting
- Evidence-bearing for audit and regulator review
- Never state-authoritative

Platform state transitions occur only through authenticated workflow routes, never from message content.

## 3) Actor Scope
Permitted participants:
- Supplier <-> Admin
- Supplier <-> Compliance
- Supplier <-> Freight
- Admin <-> Finance
- Regulator (read-only export view only)

Prohibited participants and access:
- Supplier <-> Supplier
- Buyer <-> Supplier (unless separately authorized under change control)
- Anonymous participation
- Unverified actor identity

## 4) Evidence Model
For each internal message thread, the following controls are mandatory:
- Correlation ID required (`orderId`, `complianceCaseId`, `shipmentId`, `paymentId`, or `governanceCaseId`)
- Deterministic thread ID required
- Append-only message ledger required
- Deterministic hash per message required
- Thread-level hash manifest required
- Retention class default `7Y` (subject to legal override)
- Regulator export mode required

Internal messaging is evidence-bearing equal to Email and WeChat, not ephemeral chat.

Evidence correction model:
- Corrections are append-only superseding entries and must never erase prior content.

PII minimization:
- Message content must avoid direct buyer personal identifiers and use masked references where needed.

Attachment governance:
- Attachments are permitted only when hashed, classified, and correlation-bound; otherwise prohibited.

## 5) Escalation and Ownership
Thread ownership is domain-bound:
- Order thread -> Orders domain
- Compliance thread -> Compliance domain
- Freight thread -> Freight domain
- Payment thread -> Payments domain

Escalation and fallback behavior must align to the Communications Control Plane.

## 6) Prohibited Patterns
The following patterns are explicitly prohibited:
- Real-time socket-based ephemeral chat without persistence
- Message edit/delete without append-only correction record
- State mutation via keyword parsing
- Free-form admin broadcast
- Cross-thread duplication without shared correlation ID
- Attachments without hashing
- Unbounded file uploads

## 7) Regulator Exposure
Regulator access requirements:
- Read-only export surface
- Hash-first representation
- Transcript export only under legal basis and approved disclosure pathway
- No external platform mirroring

## 8) Rollout Gates (Future Build Phase)
Future build authorization requires these governance gates:
- Gate 1: Schema + immutability review
- Gate 2: RBAC enforcement validation
- Gate 3: Audit export validation
- Gate 4: CI governance checks
- Gate 5: Regulator dry-run review

No gate in this document authorizes runtime implementation.

## 9) Design Constraints
This extension must not introduce a universal chat abstraction.
It must integrate under the Communications Control Plane.
It must not bypass existing audit infrastructure.
