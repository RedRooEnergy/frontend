# EXT-04 — Payments, Escrow & Pricing Snapshot
## Authorization Rules

### Roles
- BUYER
- SUPPLIER
- ADMIN
- SYSTEM

### Rules

1. Buyers may initiate payments only for their own orders.
2. Buyers may view payment and escrow status for their own orders only.
3. Suppliers may view escrow status for orders assigned to them.
4. Suppliers may not release or modify escrow.
5. Escrow release is restricted to SYSTEM or ADMIN roles.
6. Pricing snapshots are read-only once created.
7. Refund issuance requires ADMIN or SYSTEM authorization.
8. All authorization failures must emit an audit event.
