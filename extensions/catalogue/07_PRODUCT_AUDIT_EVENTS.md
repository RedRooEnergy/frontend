# EXT-05 — Product Audit Events

Status: GOVERNANCE DRAFT

Audit Scope: DATA_MUTATION

Events:

PRODUCT_DRAFT_CREATED
- Actor: SUPPLIER
- Trigger: Draft product created
- Required Fields: productId, supplierId

PRODUCT_DRAFT_UPDATED
- Actor: SUPPLIER
- Trigger: Draft updated
- Required Fields: productId, changedFields

PRODUCT_SUBMITTED
- Actor: SUPPLIER
- Trigger: Product submitted for review
- Required Fields: productId

PRODUCT_REVIEW_STARTED
- Actor: COMPLIANCE_AUTHORITY
- Trigger: Review initiated
- Required Fields: productId

PRODUCT_APPROVED
- Actor: COMPLIANCE_AUTHORITY
- Trigger: Approved
- Required Fields: productId

PRODUCT_REJECTED
- Actor: COMPLIANCE_AUTHORITY
- Trigger: Rejected
- Required Fields: productId, reason

PRODUCT_PUBLISHED
- Actor: SYSTEM
- Trigger: Published
- Required Fields: productId

PRODUCT_SUSPENDED
- Actor: ADMIN | SYSTEM
- Trigger: Suspended
- Required Fields: productId, reason

PRODUCT_RETIRED
- Actor: ADMIN | SYSTEM
- Trigger: Retired
- Required Fields: productId

Rules:
- Every event must include requestId
- Events are immutable once emitted
- Missing fields cause hard failure

