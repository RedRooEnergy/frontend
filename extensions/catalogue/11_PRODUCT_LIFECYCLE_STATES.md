# EXT-05 — Product Lifecycle States

Status: GOVERNANCE DRAFT

Lifecycle States:

DRAFT
- Supplier editable
- Not visible externally
- No pricing snapshot allowed

SUBMITTED
- Awaiting compliance review
- Supplier read-only
- Compliance documents attached

COMPLIANCE_REQUIRED
- Additional evidence requested
- Supplier may append documents only

COMPLIANT
- Compliance approved
- Eligible for publication

PUBLISHED
- Visible to buyers
- Immutable pricing snapshot required
- Subject to catalogue rules

SUSPENDED
- Removed from buyer view
- Triggered by compliance or admin action

WITHDRAWN
- Voluntary supplier removal
- Not recoverable without new draft

State Transition Rules:
- DRAFT → SUBMITTED
- SUBMITTED → COMPLIANT | COMPLIANCE_REQUIRED
- COMPLIANCE_REQUIRED → SUBMITTED
- COMPLIANT → PUBLISHED
- PUBLISHED → SUSPENDED | WITHDRAWN
- SUSPENDED → PUBLISHED | WITHDRAWN

Prohibited Transitions:
- Any → PUBLISHED without COMPLIANT
- PUBLISHED → DRAFT
- WITHDRAWN → any

Audit Requirements:
- Every transition emits audit event
- Actor, fromState, toState, reason mandatory

