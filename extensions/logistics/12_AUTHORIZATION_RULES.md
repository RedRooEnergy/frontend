# EXT-06 — Logistics Authorization Rules

Status: GOVERNANCE DRAFT

All logistics actions are subject to Core authorization.

Roles permitted:
- SYSTEM
- ADMIN
- LOGISTICS_PROVIDER
- COMPLIANCE_AUTHORITY

Rules:
- Default-deny applies to all routes
- Explicit allow required per route
- Buyers and Suppliers have no direct write access
- Compliance Authority may verify and block logistics states
- Authorization decisions must be auditable

Failure modes:
- Unauthorized access returns 403 (AUTH_DENIED)
- No side effects on denial

