# EXT-04 — Payments, Escrow & Pricing Snapshot
## Authority Matrix

BUYER
- Initiate payment
- Request refund (within governed window)
- View escrow status (read-only)

SUPPLIER
- View escrow tied to own orders
- Cannot initiate release
- Cannot modify pricing snapshot

ADMIN
- Approve or deny escrow release
- Initiate partial or full release
- Initiate refunds
- Lock disputed funds

SYSTEM
- Issue pricing snapshots
- Enforce escrow rules
- Emit audit events
- Block illegal transitions

NO ROLE may alter a pricing snapshot once issued.
ALL financial actions require audit logging.
