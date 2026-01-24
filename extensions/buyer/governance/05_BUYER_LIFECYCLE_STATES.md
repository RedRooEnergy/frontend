# EXT-07 — Buyer Lifecycle States

Status: GOVERNANCE DRAFT

States:
- DRAFT
- VERIFIED
- SUSPENDED
- CLOSED

Allowed Transitions:
- DRAFT → VERIFIED
- VERIFIED → SUSPENDED
- SUSPENDED → VERIFIED
- VERIFIED → CLOSED

Rules:
- No backward transition from CLOSED
- All transitions must emit audit events
- Administrative actions require explicit authority

