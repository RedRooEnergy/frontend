# EXT-EMAIL-01 Close Criteria

Version: v1.0  
Status: LOCKED

EXT-EMAIL-01 is considered CLOSED only when all items below are true:

## Governance
- EMAIL_SYSTEM_GOVERNANCE.md locked
- EMAIL_EVENT_TAXONOMY.md locked
- TEMPLATE_GOVERNANCE_RULES.md locked
- EMAIL_TEMPLATE_REGISTER.md locked

## Code Enforcement
- eventCode is closed enum
- unknown eventCodes rejected
- template mismatch rejected
- role leakage rejected
- no free‑send endpoints

## Operational Behaviour
- deterministic rendering with SHA‑256
- idempotency enforced
- retry policy enforced
- provider abstraction in place

## Admin & User Surfaces
- Admin dispatch logs + preview + kill switch
- Buyer/Supplier read‑only inbox views

## Audit Exports
- JSON export
- PDF export
- manifest hashing

## CI
- renderer determinism test
- role leakage test
- event taxonomy test
