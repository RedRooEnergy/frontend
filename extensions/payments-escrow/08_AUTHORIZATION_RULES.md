# EXT-04 — Payments, Escrow & Pricing Snapshot
## Authorization Rules

### General Rule
All routes are denied by default unless explicitly allowed.

---

### Payment Intent Creation
Route:
POST /payments/intents

Allowed Roles:
- BUYER
- SYSTEM

Conditions:
- Pricing Snapshot must be immutable and verified
- Order must be in PRE_PAYMENT state

---

### Escrow Status Retrieval
Route:
GET /escrow/{orderId}

Allowed Roles:
- BUYER (own order only)
- ADMIN
- SYSTEM

---

### Escrow Release
Route:
POST /escrow/{orderId}/release

Allowed Roles:
- ADMIN
- SYSTEM

Conditions:
- Compliance verified
- Shipment marked DISPATCHED or DELIVERED
- Audit event required

---

### Refund Processing
Route:
POST /payments/{paymentIntentId}/refund

Allowed Roles:
- ADMIN
- SYSTEM

Conditions:
- Refund governance rules satisfied
- Audit event required

