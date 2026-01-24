# EXT-04 — Payments, Escrow & Pricing Snapshot
## Authorization Rules

### Roles

- BUYER
- ADMIN
- SYSTEM

---

### Permissions

BUYER
- Create payment intent for own order
- View escrow status for own order
- Request refund for own order

ADMIN
- View escrow status for any order
- Release escrow after compliance + delivery confirmation
- Force refund under dispute resolution

SYSTEM
- Verify pricing snapshot integrity
- Enforce escrow holds and releases
- Emit audit events

---

### Deny Rules

- Suppliers may never access payment or escrow endpoints.
- Buyers may never release escrow.
- No role may modify a pricing snapshot.
- All actions default to DENY unless explicitly allowed above.

