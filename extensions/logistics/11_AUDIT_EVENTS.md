# EXT-06 — Logistics Audit Events

Status: GOVERNANCE DRAFT

All logistics state changes must emit audited events.

Required audit scopes:
- LOGISTICS_CREATE
- LOGISTICS_UPDATE
- LOGISTICS_TRACKING_APPEND
- LOGISTICS_VERIFY
- LOGISTICS_EXCEPTION

Mandatory fields:
- eventId
- requestId
- actorId
- role
- action
- resourceId
- outcome
- timestamp

Rules:
- Audit emission is mandatory for every mutation
- Read-only access does not emit events
- Events must comply with Core audit contract
- Failure to emit audit = hard failure

