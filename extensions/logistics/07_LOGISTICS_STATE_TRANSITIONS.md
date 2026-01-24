# EXT-06 — Logistics State Transitions

Status: GOVERNANCE DRAFT

This document defines allowed shipment state transitions.

Allowed Transitions:
- DRAFT → BOOKED
- BOOKED → IN_TRANSIT
- IN_TRANSIT → CUSTOMS_HELD
- CUSTOMS_HELD → CUSTOMS_CLEARED
- CUSTOMS_CLEARED → DELIVERED
- IN_TRANSIT → FAILED
- CUSTOMS_HELD → FAILED

Prohibited:
- Any backward transition
- Skipping required states
- Manual override without Change Control

Rules:
- Each transition must be authorized
- Each transition emits an audit event
- Invalid transitions must fail hard

