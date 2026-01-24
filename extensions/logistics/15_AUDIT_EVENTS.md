# EXT-06 — Logistics Audit Events

Status: GOVERNANCE DRAFT

All logistics state changes must emit audit events.

Defined Events:

LOGISTICS_CREATE
- Scope: DATA_MUTATION
- Actor: system | supplier | admin
- Resource: logistics
- Outcome: ALLOW | DENY

LOGISTICS_TRACKING_APPEND
- Scope: DATA_MUTATION
- Actor: system | logistics_provider
- Resource: logistics_tracking
- Append-only

LOGISTICS_VERIFY
- Scope: COMPLIANCE
- Actor: compliance_authority
- Resource: logistics
- Outcome: PASS | FAIL

Rules:
- requestId is mandatory
- actor context must be bound
- audit events are immutable
- no silent failures permitted

