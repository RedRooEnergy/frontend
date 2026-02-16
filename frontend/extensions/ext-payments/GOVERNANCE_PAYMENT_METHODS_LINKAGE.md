# Payments Extension Governance Linkage
Version: v1.0 (LOCKED)  
Scope: Governance-only; no implementation

## Binding References
- 04.06 Buyer → Supplier Payment Methods and Best Practice
- 04.07 Supplier Onboarding Payment Appendix
- 04.08 Buyer Payment Decision Tree

## Rules
- Extensions must consume the above governance documents as authoritative inputs.
- No extension may override payment method approvals, prepayment rules, or staging requirements.
- Pricing snapshot integrity and escrow sequencing are mandatory for any payment extension.
- Any future PSP/rail integration must map to approved corridors and rails defined in 04.06.

## Implementation Dependency
- Technical implementations (Stripe/Wise/Airwallex) must register their compliance with these governance docs before activation.
- Any deviation requires a documented waiver and admin approval ID.

## Governance Lock
- This document is locked. No changes permitted without formal change control approval.

Status: Locked.  
Implementation: Not authorised.
