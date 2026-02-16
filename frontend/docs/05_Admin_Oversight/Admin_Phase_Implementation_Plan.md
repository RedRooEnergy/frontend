# Admin Phase Implementation Plan
Version: v1.0 (LOCKED)  
Implementation: Authorised baseline (no changes without change control)

Source Governance (LOCKED)
- 05.01 Admin Oversight and Approvals
- 05.02 Dispute Resolution Governance
- 05.03 Compliance Approval Workflows
- 05.04 Audit Exports and Reporting

Purpose
Translate locked governance into an implementation-ready admin plan: dashboards, approvals, disputes, compliance checks, audit exports, permissions, state transitions, validations, evidence, escalation, and forbidden actions. No code changes.

## 1) Admin Dashboards & Permissions (05.01)
UI
- Unified admin console with tabs: Payments/Refunds, Settlements, Compliance, Disputes, Audit.
- Display escrow status, review flags, overrides applied, approval IDs, timestamps.
- Override actions surfaced with mandatory rationale and approvalId fields.

Backend/State
- Role/permission model: admin levels (ops/compliance/finance/senior).
- Approval records: {action, orderId, approverRole, approvalId, rationale, timestamp}.

Validations
- Override requires approvalId + rationale; denied if missing.
- Actions logged to audit with order/supplier IDs.

Forbidden Actions
- No silent state changes; all admin actions must emit audit events.
- No override without approvalId/rationale.

## 2) Dispute Resolution Flows (05.02)
UI
- Dispute queue with statuses: OPEN → IN_REVIEW → RESOLVED.
- Actions: request evidence, add resolution, apply outcome (refund/hold/release).
- Evidence viewer for shipment proof, correspondence, condition photos.

Backend/State
- Dispute model linked to order/line items.
- Outcomes can trigger state: hold escrow, refund initiation, or settlement pause.

Validations
- Dispute cannot be closed without recorded resolution + evidence reference.
- Refund/hold triggers must align with eligibility rules.

Forbidden Actions
- No settlement release while dispute IN_REVIEW.
- No refund without dispute outcome recorded.

## 3) Compliance Approval Gates (05.03)
UI
- Compliance queue per order/product: statuses PENDING → APPROVED → REJECTED.
- Actions: request missing certs, approve/reject with rationale.
- Evidence checklist: certifications, HS codes, licences, KYC/KYB checks.

Backend/State
- Compliance decision record per order/product with linked documents.
- Rejection sets order to PAYMENT_REVIEW_REQUIRED or payout hold.

Validations
- Approval requires required evidence complete; rejection requires rationale.
- State transitions must be auditable and immutable.

Forbidden Actions
- No listing/settlement if compliance status not APPROVED.
- No manual removal of evidence links post-approval without new decision.

## 4) Audit Exports & Reporting (05.04)
UI
- Admin export panel: select date range and export type (payments, refunds, settlements, overrides, compliance, disputes).
- Download CSV/JSON with hash shown for integrity.

Backend/State
- Export generator that signs export (hash) and logs export event with requester.
- Include fields per governance: orderId, payer/supplier, method, currency, FX (if any), approvalIds, timestamps.

Validations
- Exports must mask secrets; only necessary fields included.
- Hash stored for later verification.

Forbidden Actions
- No export without audit log entry.
- No inclusion of raw secrets or keys.

## 5) Escalation & Evidence Requirements
- Escalation: Ops → Compliance → Senior Admin; recorded in audit with level and timestamp.
- Evidence must be attached (URI/hash) for disputes and compliance approvals.
- Missing evidence blocks approval/closure actions.

## 6) State Transitions Summary
- Disputes: OPEN → IN_REVIEW → RESOLVED (outcomes: refund/hold/release).
- Compliance: PENDING → APPROVED/REJECTED; REJECTED can return to PENDING on remediation.
- Payments/settlements: respect escrow/review/settlement rules; admin overrides require approvalId.

## 7) Audit & Logging
- All admin actions emit audit events with IDs (order/supplier), action, approver role, approvalId, rationale, timestamp.
- Duplicate/ idempotent handling required for webhook-related updates; admin actions must not conflict with webhook state.

Status: Locked baseline.  
Implementation changes require formal change control.
