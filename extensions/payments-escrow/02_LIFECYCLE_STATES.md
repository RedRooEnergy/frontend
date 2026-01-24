# EXT-04 — Payments, Escrow & Pricing Snapshot
## Lifecycle States

PAYMENT_INTENT_CREATED  
Pricing snapshot issued. No funds captured.

ESCROW_HELD  
Funds authorized and held in escrow against the pricing snapshot.

PARTIAL_RELEASED  
One or more suppliers released funds per governed milestone.

FULLY_RELEASED  
All escrow funds released. Order financially settled.

REFUND_INITIATED  
Refund process started. Snapshot reference mandatory.

REFUNDED  
Funds returned to buyer. Ledger entry closed.

CHARGEBACK_PENDING  
External dispute received. Escrow frozen.

CHARGEBACK_RESOLVED  
Dispute resolved. Final settlement recorded.

States are immutable once exited.
State transitions MUST emit audit events.
Illegal transitions MUST fail hard.
