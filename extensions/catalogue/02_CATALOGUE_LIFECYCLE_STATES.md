# EXT-05 — Catalogue Lifecycle States

Status: GOVERNANCE DRAFT

Defined States:
- DRAFT
- SUBMITTED
- COMPLIANCE_PENDING
- APPROVED
- PUBLISHED
- SUSPENDED
- RETIRED

State Rules:
- DRAFT: Supplier-editable, not visible externally
- SUBMITTED: Locked pending review
- COMPLIANCE_PENDING: Awaiting certification validation
- APPROVED: Ready for publication
- PUBLISHED: Visible to buyers, immutable
- SUSPENDED: Temporarily hidden due to compliance or policy issue
- RETIRED: Permanently withdrawn; historical record retained

Immutability:
- PUBLISHED and RETIRED states are immutable
- Any modification requires a new version

Audit:
All state transitions must emit audited events.

