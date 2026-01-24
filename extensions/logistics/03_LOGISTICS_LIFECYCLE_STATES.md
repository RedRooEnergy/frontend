# EXT-06 — Logistics Lifecycle States

Status: GOVERNANCE DRAFT

Lifecycle States:

DRAFT
- Shipment data collected
- No booking created
- No pricing bound

PRICED
- DDP pricing calculated
- Pricing snapshot bound
- Immutable from this point

BOOKED
- Carrier booking confirmed
- Tracking reference assigned

IN_TRANSIT
- Shipment departed origin
- In-transit milestones recorded

CUSTOMS_REVIEW
- Awaiting customs clearance
- Exceptions and holds handled here

CLEARED
- Customs cleared
- Ready for final delivery

DELIVERED
- Delivered to buyer
- Triggers escrow release eligibility

FAILED
- Shipment failed or cancelled
- Escalation and refund workflows triggered

Rules:
- State transitions are linear and irreversible
- FAILED is terminal
- DELIVERED is terminal
- All transitions emit audit events

