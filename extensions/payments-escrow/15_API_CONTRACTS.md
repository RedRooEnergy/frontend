# EXT-04 — Payments, Escrow & Pricing Snapshot
## API Contracts

All APIs are immutable once published.
Contracts describe shape only. No business logic.

---

### Create Payment Intent

POST /api/payments/intent

Request:
- orderId (string, required)
- pricingSnapshotId (string, required)

Response:
- paymentIntentId (string)
- status (PENDING | FAILED)
- requestId (string)

---

### Capture Payment (SYSTEM)

POST /api/payments/capture

Request:
- paymentIntentId (string)

Response:
- status (CAPTURED | FAILED)
- requestId (string)

---

### Escrow Release (ADMIN)

POST /api/payments/escrow/release

Request:
- orderId (string)

Response:
- status (RELEASED | BLOCKED)
- requestId (string)

---

### Refund Request (BUYER)

POST /api/payments/refund/request

Request:
- orderId (string)
- reason (string)

Response:
- refundRequestId (string)
- status (PENDING | DENIED)
- requestId (string)

---

### Error Contract (All Endpoints)

Error Response:
- error (code)
- message (safe string)
- requestId (string)

No endpoint may return stack traces or internal details.

