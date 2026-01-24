# EXT-04 — Payments, Escrow & Pricing Snapshot
## Scope Definition

This extension governs all payment-related flows that occur after a buyer initiates checkout and before final settlement.

In scope:
- Pricing snapshot issuance and immutability
- Escrow hold, partial release, and final settlement
- Refund and chargeback linkage to original snapshots
- Financial audit events and reconciliation hooks
- Integration boundary with payment providers

Out of scope:
- Product pricing calculation logic (Core / Commercial Governance)
- Tax rule definition (handled by Commercial Governance)
- UI presentation of payments (Buyer/Admin dashboards)

All payment actions MUST:
- Reference an immutable pricing snapshot
- Emit audit events with requestId correlation
- Enforce default-deny authorization
- Be reversible only through governed refund flows
