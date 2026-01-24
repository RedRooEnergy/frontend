# EXT-04 — Payments, Escrow & Pricing Snapshot
## Core Data Models

### PaymentRecord
- paymentId (string, immutable)
- orderId (string, immutable)
- buyerId (string, immutable)
- provider (enum: STRIPE | PAYPAL | OTHER)
- amount (number, immutable)
- currency (string)
- status (INITIATED | AUTHORISED | FAILED)
- createdAt (timestamp, immutable)

### PricingSnapshot
- pricingSnapshotId (string, immutable)
- orderId (string, immutable)
- hash (sha256, immutable)
- totalAmount (number, immutable)
- taxAmount (number, immutable)
- discountAmount (number, immutable)
- createdAt (timestamp, immutable)

### EscrowAccount
- escrowId (string, immutable)
- paymentId (string, immutable)
- amountHeld (number, immutable)
- status (HELD | RELEASED | LOCKED)
- createdAt (timestamp, immutable)
- releasedAt (timestamp, optional)

### RefundRecord
- refundId (string, immutable)
- paymentId (string, immutable)
- amount (number, immutable)
- reasonCode (string)
- createdAt (timestamp, immutable)
