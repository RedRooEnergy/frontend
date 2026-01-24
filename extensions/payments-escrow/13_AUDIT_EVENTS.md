# EXT-04 — Payments, Escrow & Pricing Snapshot
## Audit Events

All payment and escrow actions are audit-mandated.  
Events are immutable, request-correlated, and emitted by the Core audit logger.

---

### Event Catalogue

PAYMENT_INTENT_CREATED  
- Scope: FINANCIAL  
- Actor: BUYER  
- Trigger: Buyer initiates checkout  
- Outcome: ALLOW / DENY  

ESCROW_HELD  
- Scope: FINANCIAL  
- Actor: SYSTEM  
- Trigger: Payment captured  
- Outcome: ALLOW  

ESCROW_RELEASED  
- Scope: FINANCIAL  
- Actor: ADMIN  
- Trigger: Compliance + delivery verified  
- Outcome: ALLOW  

REFUND_REQUESTED  
- Scope: FINANCIAL  
- Actor: BUYER  
- Trigger: Refund initiated  
- Outcome: ALLOW / DENY  

REFUND_ISSUED  
- Scope: FINANCIAL  
- Actor: ADMIN or SYSTEM  
- Trigger: Dispute or return approved  
- Outcome: ALLOW  

PRICING_SNAPSHOT_VERIFIED  
- Scope: GOVERNANCE  
- Actor: SYSTEM  
- Trigger: Pre-payment validation  
- Outcome: ALLOW / DENY

---

### Mandatory Fields

- eventId
- timestamp (UTC ISO-8601)
- requestId
- actorId
- role
- action
- resource
- outcome
- scope

---

### Prohibited

- No silent financial mutations
- No unaudited refunds
- No audit suppression under any circumstances

