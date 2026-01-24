# EXT-05 — Product Lifecycle States

Status: GOVERNANCE DRAFT

Lifecycle States:
- DRAFT
- SUBMITTED
- COMPLIANCE_REVIEW
- APPROVED
- PUBLISHED
- SUSPENDED
- RETIRED

Allowed Transitions:
- DRAFT → SUBMITTED
- SUBMITTED → COMPLIANCE_REVIEW
- COMPLIANCE_REVIEW → APPROVED | REJECTED (returns to DRAFT)
- APPROVED → PUBLISHED
- PUBLISHED → SUSPENDED | RETIRED
- SUSPENDED → PUBLISHED | RETIRED

Rules:
- No skipping states
- Rejected products must return to DRAFT
- Published products are immutable except via SUSPEND or RETIRE
- All transitions emit audit events
- System enforces transitions; UI cannot override

