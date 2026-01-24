# EXT-04 — Payments, Escrow & Pricing Snapshot
## Authorization Rules

All payment-related actions are subject to default-deny authorization.
Only explicitly permitted roles may perform the actions below.

---

### Role Permissions

BUYER
- Create payment intent
- View own payment status
- Request refund (within policy window)

SUPPLIER
- View escrow status for own orders
- No authority to release funds

ADMIN
- Approve escrow release
- Approve refunds
- Override payment failures (audited only)

SYSTEM
- Capture payments
- Hold escrow
- Verify pricing snapshots
- Emit financial audit events

---

### Enforcement Rules

- No role may bypass escrow
- No direct fund transfer without pricing snapshot verification
- No refund without audit event
- All denials must return AUTH_DENIED with requestId

---

### Explicit Denials

- BUYER cannot release escrow
- SUPPLIER cannot initiate refunds
- ADMIN cannot alter pricing snapshots
- SYSTEM actions are non-interactive and auditable only

