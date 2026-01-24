# EXT-03 — Logistics, Freight & DDP
## Audit Events

This document defines the mandatory audit events for the Logistics & DDP extension.

### Event List

LOGISTICS_DRAFT_CREATED
- Scope: DATA_MUTATION
- Actor: SYSTEM
- Trigger: Draft freight record initialized

DDP_CALCULATION_COMPLETED
- Scope: DATA_MUTATION
- Actor: SYSTEM
- Trigger: Duties, taxes, and freight costs calculated

COMPLIANCE_VERIFIED
- Scope: GOVERNANCE
- Actor: COMPLIANCE_AUTHORITY
- Trigger: Compliance approval recorded

SHIPMENT_DISPATCHED
- Scope: DATA_MUTATION
- Actor: LOGISTICS_PROVIDER
- Trigger: Shipment marked in transit

DELIVERY_CONFIRMED
- Scope: DATA_MUTATION
- Actor: LOGISTICS_PROVIDER
- Trigger: Delivery confirmation recorded

LOGISTICS_EXCEPTION_RAISED
- Scope: GOVERNANCE
- Actor: SYSTEM
- Trigger: Exception state entered

LOGISTICS_CLOSED
- Scope: GOVERNANCE
- Actor: SYSTEM
- Trigger: Final state closure

### Audit Rules

- All events must include requestId.
- All SYSTEM events are mandatory.
- No audit event may be suppressed.
- Audit scope must match event intent.
