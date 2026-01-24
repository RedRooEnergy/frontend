# EXT-04 — Payments, Escrow & Pricing Snapshot
## API Contracts

### Create Payment Intent
POST /api/payments/intent

Request:
- orderId (string)
- pricingSnapshotId (string)

Response:
- paymentIntentId (string)
- provider (enum: STRIPE | PAYPAL | ALIPAY | UNIONPAY)

---

### Escrow Status
GET /api/payments/escrow/{orderId}

Response:
- orderId (string)
- escrowStatus (HELD | RELEASED | REFUNDED)
- amount (number)
- currency (string)

---

### Release Escrow
POST /api/payments/escrow/release

Request:
- orderId (string)

Response:
- success (boolean)

---

### Refund Payment
POST /api/payments/refund

Request:
- orderId (string)
- reason (string)

Response:
- refundId (string)
- status (PENDING | COMPLETED)

### Rules

- All endpoints require authorization.
- All write operations emit audit events.
- Pricing snapshots are immutable and referenced by ID only.

