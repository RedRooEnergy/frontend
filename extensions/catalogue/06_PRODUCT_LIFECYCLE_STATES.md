# EXT-05 — Product Lifecycle States

Status: GOVERNANCE DRAFT

States:
- DRAFT
- SUBMITTED
- UNDER_REVIEW
- APPROVED
- REJECTED
- PUBLISHED
- SUSPENDED
- RETIRED

Allowed Transitions:

DRAFT → SUBMITTED
SUBMITTED → UNDER_REVIEW
UNDER_REVIEW → APPROVED
UNDER_REVIEW → REJECTED
APPROVED → PUBLISHED
PUBLISHED → SUSPENDED
SUSPENDED → PUBLISHED
PUBLISHED → RETIRED

Rules:
- No backward transitions except via REJECTED
- Published products are immutable except status
- Retired products are permanently read-only
- All transitions must emit audit events
- Invalid transitions must hard-fail

