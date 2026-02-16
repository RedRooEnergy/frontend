# Supplier Phase Implementation Plan
Version: v1.0 (LOCKED)  
Implementation: Authorised baseline (no changes without change control)

Source Governance (LOCKED)
- 04.07 Supplier Onboarding Payment Appendix (v1.0 LOCKED)
- 04.09 Supplier Onboarding UX Governance (v1.0 LOCKED)
- 04.10 Supplier Product Lifecycle Governance (v1.0 LOCKED)
- 04.11 Fulfilment and Shipment Governance (v1.0 LOCKED)
- 04.12 Supplier Payout Readiness (v1.0 LOCKED)

Purpose
Translate locked governance into an implementation-ready plan: screens, states, APIs, validations, forbidden actions. No code changes.

## 1) Supplier Onboarding Flow (from 04.07, 04.09)
UI
- Onboarding wizard: KYB details, compliance declarations, payment capability declaration, full-prepayment flag acknowledgement.
- Banking/payout form: beneficiary details, currency preference (AUD default), rail preferences (Wise/Airwallex/SWIFT), confirmation that beneficiary matches KYB entity.
- Summary/attestation screen: explicit acceptance of payout rules and no off-platform payments.

Backend/State
- Models: Supplier profile with KYB status, paymentCapability {rails, currencies, beneficiary}, fullPrepaymentRequired flag (default true), waiver records with approvalId.
- Validations: mandatory KYB fields, beneficiary name match, required payout rail for AUD; waiver only if approvalId present.

Forbidden Actions
- No off-platform payment instructions.
- No staging enablement without waiver + approvalId.
- No payout rail without beneficiary/KYB match.

## 2) Supplier Product Lifecycle (from 04.10)
UI
- Product submission screen: category selection, certifications upload per category, pricing snapshot capture, readiness checklist.
- Product approval queue (admin) reference only; supplier view shows statuses: SUBMITTED → REVIEW → APPROVED → LISTED → SALE → FULFILMENT → DELIVERED → RETURN_WINDOW → SETTLEMENT_ELIGIBLE → SETTLED.

Backend/State
- Product state machine enforcing allowed transitions.
- Required fields per transition: certifications (SUBMITTED→REVIEW), approval record (REVIEW→APPROVED), pricingSnapshotHash (SALE), shipment linkage (FULFILMENT).

Validations
- No LISTED without APPROVED.
- No SALE without pricingSnapshotHash.
- No SETTLEMENT_ELIGIBLE without delivery proof + return-window expiry (or admin override).

Forbidden Actions
- Supplier cannot self-approve products.
- Supplier cannot bypass pricing snapshot at sale.
- No state jumps that skip required evidence.

## 3) Fulfilment & Shipment Updates (from 04.11)
UI
- Shipment milestone capture: pickup, export clearance, in-transit (tracking), delivery (POD).
- Timeline visible to buyer; documents optionally downloadable where allowed.

Backend/State
- Shipment record linked to order: carrier, trackingId, timestamps, documents refs.
- Return window start = delivery timestamp.

Validations
- Delivery milestone requires POD timestamp.
- Milestones must be chronological.

Forbidden Actions
- Cannot mark delivered without POD evidence.
- Cannot edit milestones after settlement except via admin override with audit.

## 4) Payout Readiness Gates (from 04.12)
UI
- Payout readiness checklist in supplier dashboard: KYB status, banking verified, tax/export docs, disputes/returns/warranties status.

Backend/State
- Readiness gate computed from: KYB complete, beneficiary verified, no active disputes/returns/warranties, delivery + return window expiry, compliance cleared.
- Blocks settlement trigger if any gate fails (unless admin override with approvalId).

Forbidden Actions
- No settlement if disputes/returns/warranties active.
- No payout if beneficiary/KYB mismatch or sanctions pending.

## 5) Payment Capability Enforcement (from 04.07/04.09)
UI
- Supplier declaration screen with rails/currencies; flag full prepayment accepted.
- Display “Full prepayment required” badge on supplier profile until waiver exists.

Backend/State
- Store payment rails and currencies; require AUD acceptance.
- Waiver requires approvalId; log in audit trail.

Forbidden Actions
- Removing full-prepayment flag without waiver.
- Enabling unsupported rails/currencies.

## 6) Governance to Implementation Mapping Summary
- Every UI action maps to required evidence and state transition.
- Every transition requires audit event with order/product/supplier ID and approver where applicable.
- Admin overrides must carry approvalId and rationale; suppliers cannot self-override.

Status: Locked baseline.  
Implementation changes require formal change control.
