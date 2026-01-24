# EXT-03 — Logistics, Freight & DDP
## Authorization Rules (Governance-Bound)

This document defines who may perform which actions within the Logistics & DDP extension.
All rules default to DENY unless explicitly allowed.

---

## Roles

- SYSTEM
- SUPPLIER
- COMPLIANCE_AUTHORITY
- ADMIN

---

## Authorization Matrix

### Create Logistics Draft
- Allowed: SYSTEM
- Denied: SUPPLIER, COMPLIANCE_AUTHORITY, ADMIN

### Calculate Duties, Taxes & Freight
- Allowed: SYSTEM
- Denied: All others

### View Logistics Draft
- Allowed: SYSTEM, SUPPLIER (own records only), COMPLIANCE_AUTHORITY, ADMIN
- Condition: SUPPLIER access is supplierId-scoped

### Verify Compliance
- Allowed: COMPLIANCE_AUTHORITY
- Denied: SYSTEM, SUPPLIER, ADMIN

### Dispatch Shipment
- Allowed: SYSTEM
- Precondition: Draft status MUST be VERIFIED

### Close Logistics Record
- Allowed: SYSTEM
- Precondition: Shipment status MUST be DELIVERED

---

## Enforcement Rules

- Authorization is evaluated before any state mutation.
- Failed authorization attempts MUST emit an audit event with outcome = DENY.
- No administrative override is permitted.

---

## Audit Binding

Each authorization decision MUST emit:
- action: LOGISTICS_AUTH_CHECK
- scope: DATA_MUTATION
- outcome: ALLOW or DENY
- actorRole
- resourceId (logisticsDraftId or shipmentId)
