# EXT-03 — Logistics, Freight & DDP
## Audit Events (Mandatory)

This document defines all audit events that MUST be emitted by the Logistics & DDP extension.
All events are governance-significant and immutable once recorded.

---

## Audit Scopes

- DATA_MUTATION
- GOVERNANCE

---

## Required Events

### LOGISTICS_DRAFT_CREATED
- scope: DATA_MUTATION
- actorRole: SYSTEM
- resource: logisticsDraftId
- outcome: ALLOW

### LOGISTICS_CALCULATION_EXECUTED
- scope: DATA_MUTATION
- actorRole: SYSTEM
- resource: logisticsDraftId
- outcome: ALLOW

### LOGISTICS_DRAFT_VIEWED
- scope: GOVERNANCE
- actorRole: SYSTEM | SUPPLIER | COMPLIANCE_AUTHORITY | ADMIN
- resource: logisticsDraftId
- outcome: ALLOW

### LOGISTICS_VERIFIED
- scope: DATA_MUTATION
- actorRole: COMPLIANCE_AUTHORITY
- resource: logisticsDraftId
- outcome: ALLOW

### LOGISTICS_DISPATCHED
- scope: DATA_MUTATION
- actorRole: SYSTEM
- resource: shipmentId
- outcome: ALLOW

### LOGISTICS_CLOSED
- scope: DATA_MUTATION
- actorRole: SYSTEM
- resource: shipmentId
- outcome: ALLOW

---

## Denied Actions

### LOGISTICS_AUTH_DENIED
- scope: GOVERNANCE
- actorRole: any
- resource: attemptedResourceId
- outcome: DENY
- severity: WARN

---

## Enforcement Rules

- Every state mutation MUST emit exactly one audit event.
- Failed authorization MUST emit LOGISTICS_AUTH_DENIED.
- Audit emission occurs before response is returned.
- Audit events are immutable and never deleted.
