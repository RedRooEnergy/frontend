# EXT-04 — Payments, Escrow & Pricing Snapshot
## API Contracts (Read-Only)

### Create Payment Intent
POST /payments/intents

Request:
{
  orderId: string
  pricingSnapshotId: string
}

Response:
{
  paymentIntentId: string
  status: "CREATED" | "FAILED"
}

---

### Retrieve Escrow Status
GET /escrow/{orderId}

Response:
{
  orderId: string
  escrowStatus: "HELD" | "RELEASED" | "REFUNDED"
  amount: number
  currency: string
}

---

### Release Escrow
POST /escrow/{orderId}/release

Response:
{
  orderId: string
  escrowStatus: "RELEASED"
  releasedAt: string
}

---

### Refund Payment
POST /payments/{paymentIntentId}/refund

Response:
{
  paymentIntentId: string
  status: "REFUNDED"
  refundedAt: string
}

