# Payments & Escrow Implementation Plan
Version: v0.1 (DRAFT — Planning Only)  
Implementation: Not authorised

Source Governance (LOCKED)
- 06.01 Payments and Escrow Hardening
- 04.06 Buyer → Supplier Payment Methods and Best Practice
- 04.07 Supplier Onboarding Payment Appendix
- 04.08 Buyer Payment Decision Tree

Purpose
Translate locked governance into an implementation-ready plan: Stripe/Wise flows, escrow holds/releases, refunds, settlements, webhooks, idempotency, failure modes, reconciliation, audit logging, and forbidden actions. Text-only state diagrams. No code changes.

## 1) Payment Rails & Flows
Stripe (cards)
- Use Checkout Sessions; capture pricingSnapshotHash in metadata.
- States: PENDING → PAYMENT_INITIATED → PAID (escrow HELD) or PAYMENT_REVIEW_REQUIRED.
Wise (payouts)
- Used for supplier settlements in AUD→local payouts; sandbox/live per environment.

Approved Methods (per 04.06)
- Stripe card (small/medium orders), Wise/Airwallex/SWIFT for larger or payout legs.
- Exclusions: no cash/crypto/unapproved PSPs.

## 2) Escrow Hold & Release Conditions
Escrow states (text diagram):
- HELD → (delivery proof + return-window expiry) → SETTLEMENT_ELIGIBLE → SETTLED
- HELD → REFUND_REQUESTED → REFUNDED
- HELD → PAYMENT_REVIEW_REQUIRED (hash mismatch) → manual resolution → HELD or REFUNDED

Release conditions
- SETTLEMENT_ELIGIBLE only after delivery proof + return window expiry OR admin override with approvalId.
- REFUNDED only via verified webhook or approved override with audit trail.

## 3) Refund Automation (Stripe)
- Eligibility: PAID/SETTLEMENT_ELIGIBLE, escrow HELD, not SETTLED unless admin refund override.
- Flow: buyer request → create Stripe refund → webhook `charge.refunded`/`refund.succeeded` → order REFUNDED, escrow RELEASED.
- Audit: STRIPE_REFUND_INITIATED, STRIPE_REFUND_SUCCEEDED, BUYER_REFUND_REQUESTED.

## 4) Settlements Automation (Wise)
- Eligibility: SETTLEMENT_ELIGIBLE, escrow HELD, no active disputes/returns/warranties.
- Flow: admin “Release Funds” → Wise transfer create → on success SETTLED, escrow SETTLED.
- Overrides require approvalId; blocked if refund in progress or disputes active.

## 5) Webhook Handling & Idempotency
- Stripe webhooks: verify signature, check pricingSnapshotHash, store processed event IDs; duplicates ignored.
- Wise callbacks (if enabled): verify signature/token, idempotent on transfer ID.
- No state mutation without webhook/audit; all mutations append timeline entries.

## 6) Failure Modes & Reconciliation
- Payment failures: remain PENDING; show retriable error; audit PAY_FAIL with reason.
- Refund failures: keep REFUND_REQUESTED with error flag; retry path admin-only.
- Settlement failures: keep SETTLEMENT_ELIGIBLE with error flag; retry logged.
- Reconciliation job (manual/cron later): compare orders vs webhook logs vs provider status; discrepancies flagged for review.

## 7) Audit Logging (must)
- Every transition emits audit: who, what, when, rationale, approvalId (if override).
- Exports per 05.04: include method, currency, amounts, FX (if any), provider IDs, hashes.

## 8) State Diagram (text)
- Orders: PENDING → PAYMENT_INITIATED → PAID (escrow HELD) → PROCESSING/SHIPPED/DELIVERED → SETTLEMENT_ELIGIBLE → SETTLED
- Refund path: PAID/SETTLEMENT_ELIGIBLE → REFUND_REQUESTED → REFUNDED
- Review branch: PAYMENT_REVIEW_REQUIRED → (admin resolution) → PAID or REFUNDED

## 9) Validations & Controls
- PricingSnapshotHash required before payment initiation; mismatch triggers PAYMENT_REVIEW_REQUIRED.
- Settlement blocked if disputes/returns/warranties active or compliance not approved.
- Refund blocked if SETTLED unless admin refund override with approvalId.
- Webhooks must be verified and idempotent; unverified payloads rejected.

## 10) Forbidden Actions
- No off-platform payments or payouts.
- No settlement or refund without provider confirmation or admin override with approvalId.
- No state changes without audit/timeline entry.
- No disabling webhook signature checks or idempotency.

Status: Draft complete (Planning only).  
Implementation: Not authorised.
