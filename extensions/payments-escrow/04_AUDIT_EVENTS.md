# EXT-04 — Payments, Escrow & Pricing Snapshot
## Audit Events

PAYMENT_INITIATED
- Scope: FINANCIAL
- Actor: Buyer
- Trigger: Buyer starts payment flow
- Immutable Data: pricingSnapshotId, orderId, amount

PAYMENT_AUTHORISED
- Scope: FINANCIAL
- Actor: System
- Trigger: Provider authorisation confirmed
- Immutable Data: providerRef, pricingSnapshotHash

ESCROW_FUNDS_HELD
- Scope: FINANCIAL
- Actor: System
- Trigger: Funds placed into escrow
- Immutable Data: escrowId, amount

ESCROW_RELEASED
- Scope: FINANCIAL
- Actor: Admin or System
- Trigger: Release conditions satisfied
- Immutable Data: escrowId, amountReleased

REFUND_ISSUED
- Scope: FINANCIAL
- Actor: Admin or System
- Trigger: Approved refund
- Immutable Data: refundId, amount, reasonCode

ESCROW_LOCKED
- Scope: GOVERNANCE
- Actor: System
- Trigger: Dispute or compliance breach
- Immutable Data: escrowId, lockReason
