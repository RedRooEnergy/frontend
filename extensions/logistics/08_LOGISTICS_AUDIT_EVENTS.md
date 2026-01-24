# EXT-06 — Logistics Audit Events

Status: GOVERNANCE DRAFT

This document defines mandatory audit events for logistics actions.

Required Events:
- LOGISTICS_DRAFT_CREATED
- LOGISTICS_BOOKED
- LOGISTICS_IN_TRANSIT
- LOGISTICS_CUSTOMS_HELD
- LOGISTICS_CUSTOMS_CLEARED
- LOGISTICS_DELIVERED
- LOGISTICS_FAILED

Rules:
- Every event must include requestId
- Every event must include actorId and role
- Events are immutable once written
- Missing audit events are a hard failure

