# EXT-03 — Logistics, Freight & DDP
## Authorization Rules (Default-Deny)

All access is denied unless explicitly allowed below.
All actions must be attributable to an actor and auditable.

---

## Roles (from Core)

- SYSTEM
- ADMIN
- SUPPLIER
- BUYER
- COMPLIANCE_AUTHORITY

---

## Allowed Actions

### 1) Create Logistics Draft
Route intent: POST /api/logistics/draft

Allowed:
- SUPPLIER (only for own supplierId)
- SYSTEM (background jobs only)

Denied:
- BUYER
- COMPLIANCE_AUTHORITY (no creation)
- ADMIN (may create only via SYSTEM delegation, not direct)

---

### 2) Calculate DDP
Route intent: POST /api/logistics/:logisticsDraftId/calculate

Allowed:
- SYSTEM (only)
- ADMIN (may trigger, but execution must be SYSTEM-actor audited)

Denied:
- SUPPLIER (cannot self-calculate to avoid manipulation)
- BUYER
- COMPLIANCE_AUTHORITY

---

### 3) Verify Compliance for Logistics
Route intent: POST /api/logistics/:logisticsDraftId/verify

Allowed:
- COMPLIANCE_AUTHORITY (only)
- SYSTEM (only if explicitly delegated by Compliance Authority)

Denied:
- SUPPLIER
- BUYER
- ADMIN

---

### 4) Dispatch Shipment
Route intent: POST /api/logistics/:logisticsDraftId/dispatch

Allowed:
- SUPPLIER (only after VERIFIED)
- SYSTEM (only for carrier integration jobs)

Denied:
- BUYER
- COMPLIANCE_AUTHORITY
- ADMIN

---

### 5) Read Logistics Status
Route intent: GET /api/logistics/:logisticsDraftId/status

Allowed:
- SUPPLIER (only for own drafts)
- ADMIN (read-only oversight)
- BUYER (only if orderId belongs to buyer and status >= DISPATCHED)
- COMPLIANCE_AUTHORITY (read-only)

Denied:
- Everyone else

---

## Enforcement Rules

- Supplier scoping is mandatory: supplierId must match actor supplierId.
- Buyer scoping is mandatory: orderId must belong to the buyer.
- ADMIN is oversight-only; cannot bypass state transitions.
- All denials must return standardized CoreError (AUTH_DENIED) with requestId.

---

## Terminal Rules

- CLOSED is terminal; no actions permitted except read.
- VERIFIED is required before DISPATCH.
