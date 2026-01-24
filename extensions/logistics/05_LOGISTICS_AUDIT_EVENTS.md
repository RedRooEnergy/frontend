# EXT-06 — Logistics Audit Events

Status: GOVERNANCE DRAFT

All logistics-related state changes must emit an audited event.

Mandatory Events:

LOGISTICS_BOOKING_CREATED
- Trigger: Shipment booked with logistics provider
- Scope: DATA_MUTATION
- Actor: SYSTEM or LOGISTICS_PROVIDER

LOGISTICS_TRACKING_UPDATED
- Trigger: Tracking milestone update
- Scope: DATA_MUTATION
- Actor: LOGISTICS_PROVIDER

LOGISTICS_CUSTOMS_HELD
- Trigger: Customs exception raised
- Scope: GOVERNANCE
- Actor: COMPLIANCE_AUTHORITY

LOGISTICS_CUSTOMS_CLEARED
- Trigger: Customs clearance granted
- Scope: GOVERNANCE
- Actor: COMPLIANCE_AUTHORITY

LOGISTICS_DELIVERED
- Trigger: Final delivery confirmation
- Scope: DATA_MUTATION
- Actor: LOGISTICS_PROVIDER

Rules:
- Each event must include requestId and shipmentId
- Events are immutable once emitted
- No silent state transitions are permitted

