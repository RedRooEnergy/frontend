# EXT-04 — Payments, Escrow & Pricing Snapshot
## API Contracts

### Create Payment Intent
POST /payments/intents

Request:
- orderId (string)
- pricingSnapshotId (string)

Response:
- paymentIntentId
- provider
- amount
- currency
- status

---

### Retrieve Escrow Status
GET /escrow/{orderId}

Response:
- orderId
- escrowStatus
- heldAmount
- releasedAmount

---

### Release Escrow
POST /escrow/{orderId}/release

Authorized Roles:
- ADMIN
- SYSTEM

Response:
- orderId
- releasedAt
- releasedBy

---

### Refund Payment
POST /payments/{paymentIntentId}/refund

Authorized Roles:
- ADMIN
- SYSTEM

Response:
- refundId
- amount
- status

