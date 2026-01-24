# EXT-03 — Logistics, Freight & DDP
## Authority Matrix

This document defines which roles are permitted to act at each lifecycle stage.

### Roles

- SYSTEM
- SUPPLIER
- LOGISTICS_PROVIDER
- COMPLIANCE_AUTHORITY
- ADMIN

### Authority by State

DRAFT
- SYSTEM: CREATE
- SUPPLIER: VIEW
- ADMIN: VIEW

CALCULATED
- SYSTEM: TRANSITION
- COMPLIANCE_AUTHORITY: VIEW
- ADMIN: VIEW

VERIFIED
- COMPLIANCE_AUTHORITY: APPROVE
- SYSTEM: TRANSITION
- ADMIN: VIEW

IN_TRANSIT
- LOGISTICS_PROVIDER: UPDATE_STATUS
- SYSTEM: RECORD_EVENT
- ADMIN: VIEW

DELIVERED
- LOGISTICS_PROVIDER: CONFIRM_DELIVERY
- SYSTEM: RECORD_EVENT
- ADMIN: VIEW

EXCEPTION
- SYSTEM: FLAG
- ADMIN: REVIEW
- COMPLIANCE_AUTHORITY: INVESTIGATE

CLOSED
- SYSTEM: FINALIZE
- ADMIN: VIEW

### Governance Rules

- No role may bypass state sequencing.
- No human role may modify calculated values.
- SYSTEM actions are always audited.
- ADMIN has no mutation authority.
