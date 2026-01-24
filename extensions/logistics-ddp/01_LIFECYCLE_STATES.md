# EXT-03 — Logistics, Freight & DDP
## Lifecycle States

This document defines the governed lifecycle states for logistics, freight, and Delivered Duty Paid (DDP) processing.

### States

1. DRAFT
   - Shipment record created.
   - No pricing, duty, or tax calculations are final.
   - Not visible to buyers or payments.

2. CALCULATED
   - HS codes validated.
   - Duties, GST, and freight costs calculated.
   - Currency normalization applied.
   - Snapshot created (read-only).

3. VERIFIED
   - Compliance checks passed.
   - Carrier options validated.
   - Timeout-safe verification complete.
   - Eligible for payment escrow linkage.

4. IN_TRANSIT
   - Shipment dispatched.
   - Tracking active.
   - Carrier updates read-only.
   - No mutation except status events.

5. DELIVERED
   - Delivery confirmed.
   - Proof of delivery recorded.
   - Escrow release conditions satisfied (subject to compliance).

6. EXCEPTION
   - Delay, failure, mismatch, or dispute detected.
   - Manual review required.
   - Escrow remains locked.

7. CLOSED
   - Shipment fully reconciled.
   - All audits complete.
   - Record immutable.

### Governance Rules

- State transitions are strictly sequential.
- No backward transitions are permitted.
- All transitions emit audit events.
- Financial impact states (CALCULATED onward) are immutable.
