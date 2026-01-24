EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: Authorization Rules
STATUS: GOVERNANCE DRAFT

AUTHORIZATION MODEL

Default rule:
- DENY ALL unless explicitly allowed

ROLES

- SUPPLIER
- ADMIN
- SYSTEM

ACTIONS

Draft Actions
- CREATE_DRAFT
- UPDATE_DRAFT
- SUBMIT_DRAFT
- DELETE_DRAFT (archive only)

Review Actions
- VIEW_SUBMITTED
- APPROVE_DRAFT
- REJECT_DRAFT

Publication Actions
- PUBLISH_CATALOGUE
- ARCHIVE_CATALOGUE
- VIEW_PUBLISHED

ALLOW RULES

SUPPLIER
- CREATE_DRAFT (own supplierId only)
- UPDATE_DRAFT (status = DRAFT, own supplierId)
- SUBMIT_DRAFT (status = DRAFT, own supplierId)
- VIEW_PUBLISHED (read-only)

ADMIN
- VIEW_SUBMITTED
- APPROVE_DRAFT
- REJECT_DRAFT
- PUBLISH_CATALOGUE
- ARCHIVE_CATALOGUE
- VIEW_PUBLISHED

SYSTEM
- VIEW_PUBLISHED
- ARCHIVE_CATALOGUE (system-initiated lifecycle events)

FORBIDDEN

- SUPPLIER may not approve, reject, or publish
- ADMIN may not modify draft item content
- No role may bypass audit emission
- No role may mutate published catalogues

AUDIT REQUIREMENTS

- Every authorization decision emits an audit event
- Denied actions emit severity=WARNING
- Approved publication emits severity=CRITICAL
