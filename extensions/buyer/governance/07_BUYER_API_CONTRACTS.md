# EXT-07 — Buyer API Contracts

Status: GOVERNANCE DRAFT

All buyer-facing APIs must reflect system truth and may not bypass
pricing, compliance, escrow, or audit controls.

---

## Account APIs

POST /buyer/register
- Purpose: Create buyer account
- Actor: Buyer
- Result: Buyer created in DRAFT state

POST /buyer/verify
- Purpose: Verify buyer identity
- Actor: System
- Result: Buyer moves to VERIFIED

GET /buyer/profile
- Purpose: Retrieve buyer profile
- Actor: Buyer
- Read-only

---

## Order APIs

POST /orders
- Purpose: Create new order
- Actor: Buyer (VERIFIED only)
- Preconditions:
  - Pricing snapshot issued
  - Compliance verified
- Result: Order created

GET /orders/{orderId}
- Purpose: View order details
- Actor: Buyer (own orders only)
- Read-only

POST /orders/{orderId}/cancel
- Purpose: Cancel order (if allowed)
- Actor: Buyer
- Preconditions governed by order state

---

## Rules

- All requests must include requestId
- All responses return requestId
- Authorization enforced server-side
- Errors normalized via Core error middleware
- No API may expose internal system state



