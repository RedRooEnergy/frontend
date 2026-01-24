# EXT-05 — Product Audit Events

Status: GOVERNANCE DRAFT

All product lifecycle transitions MUST emit audited events.
Audit scope: DATA_MUTATION

Required Fields (all events):
- eventId
- timestamp
- requestId
- actorId
- actorRole
- action
- resourceType: PRODUCT
- resourceId
- outcome
- severity
- metadata (immutable)

Defined Events:

PRODUCT_DRAFT_CREATED
- Trigger: Supplier creates draft
- Outcome: ALLOW
- Severity: INFO

PRODUCT_DRAFT_UPDATED
- Trigger: Supplier edits draft
- Outcome: ALLOW
- Severity: INFO

PRODUCT_SUBMITTED
- Trigger: Supplier submits for review
- Outcome: ALLOW
- Severity: INFO

PRODUCT_COMPLIANCE_REVIEW_STARTED
- Trigger: Compliance authority opens review
- Outcome: ALLOW
- Severity: INFO

PRODUCT_COMPLIANCE_APPROVED
- Trigger: Compliance authority approval
- Outcome: ALLOW
- Severity: INFO

PRODUCT_COMPLIANCE_REJECTED
- Trigger: Compliance authority rejection
- Outcome: DENY
- Severity: WARN

PRODUCT_PUBLISHED
- Trigger: System publishes product
- Outcome: ALLOW
- Severity: INFO

PRODUCT_SUSPENDED
- Trigger: Admin/System suspension
- Outcome: ALLOW
- Severity: WARN

PRODUCT_REINSTATED
- Trigger: Admin/System reinstatement
- Outcome: ALLOW
- Severity: INFO

PRODUCT_RETIRED
- Trigger: Admin/System retirement
- Outcome: ALLOW
- Severity: INFO

Rules:
- No product state change without an audit event
- Audit events are immutable
- Metadata must include previousState → newState
- Missing or malformed audit data must hard-fail

