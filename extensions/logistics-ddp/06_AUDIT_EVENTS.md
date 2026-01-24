# EXT-03 — Logistics, Freight & DDP
## Audit Events (Governance-Bound)

All events listed here are governance-significant.
Each event MUST emit an immutable audit record with requestId and actor context.

---

## Scope

Audit scope for this extension:
- DATA_MUTATION
- GOVERNANCE

No other scopes are permitted.

---

## Event Catalogue

### LOGISTICS-DRAFT-CREATED
Scope: DATA_MUTATION  
Actor: SUPPLIER or SYSTEM  
Emitted when: A logistics draft is created.  
Required fields:
- logisticsDraftId
- supplierId

---

### LOGISTICS-DDP-CALCULATED
Scope: DATA_MUTATION  
Actor: SYSTEM  
Emitted when: DDP calculation completes.  
Required fields:
- logisticsDraftId
- currency
- totalAmount
- dutyAmount
- taxAmount

---

### LOGISTICS-COMPLIANCE-VERIFIED
Scope: GOVERNANCE  
Actor: COMPLIANCE_AUTHORITY or SYSTEM (delegated)  
Emitted when: Compliance verification passes.  
Required fields:
- logisticsDraftId
- verifierId

---

### LOGISTICS-DISPATCHED
Scope: DATA_MUTATION  
Actor: SUPPLIER or SYSTEM  
Emitted when: Shipment is dispatched.  
Required fields:
- logisticsDraftId
- carrier
- trackingReference

---

### LOGISTICS-STATUS-READ
Scope: GOVERNANCE  
Actor: Any authorized reader  
Emitted when: Status is read (read-only audit).  
Required fields:
- logisticsDraftId
- readerRole

---

## Enforcement Rules

- Missing requestId is a fatal error.
- Actor role must match allowed roles for the event.
- Events are append-only and immutable.
- No audit event may be suppressed or downgraded.

---

## Failure Handling

- Any failure to emit an audit event MUST abort the operation.
- Partial success is prohibited.
