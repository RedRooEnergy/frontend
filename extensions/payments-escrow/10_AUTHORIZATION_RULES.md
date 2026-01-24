# EXT-04 — Payments, Escrow & Pricing Snapshot
## Authorization Rules

### Roles Permitted

- SYSTEM
- ADMIN
- FINANCE_AUTHORITY

### Rules

1. Only SYSTEM may create payment intents automatically during checkout.
2. ADMIN may view escrow and payment status for oversight only.
3. FINANCE_AUTHORITY may:
   - Release escrow
   - Initiate refunds
4. Buyers and Suppliers:
   - May never trigger escrow release
   - May never alter pricing snapshots
5. All authorization checks are enforced server-side.
6. Any authorization failure must emit an audit event with scope FINANCIAL_CONTROL.

### Default Rule

If no explicit allow rule applies, the action is denied.
