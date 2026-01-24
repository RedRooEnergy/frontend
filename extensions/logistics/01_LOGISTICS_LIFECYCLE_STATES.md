# EXT-06 — Logistics Lifecycle States

Status: GOVERNANCE DRAFT

Lifecycle States:

DRAFT
Shipment record created but not yet priced or validated.

PRICED
DDP costs calculated (freight, duty, GST, fees) and bound to pricing snapshot.

BOOKED
Carrier booking confirmed; tracking reference issued.

IN_TRANSIT
Shipment collected and moving through carrier network.

CUSTOMS_CLEARANCE
Customs processing underway (DDP responsibility enforced).

DELIVERED
Shipment delivered to buyer address.

EXCEPTION
Shipment blocked due to delay, customs issue, or data mismatch.

CANCELLED
Shipment cancelled prior to dispatch.

Rules:
- State transitions are forward-only unless explicitly defined
- PRICED requires immutable pricing snapshot reference
- BOOKED requires successful payment authorization
- IN_TRANSIT cannot occur without carrier confirmation
- CUSTOMS_CLEARANCE failures must emit audit events
- DELIVERED is terminal unless dispute triggers exception flow
- All state changes must emit audited events

