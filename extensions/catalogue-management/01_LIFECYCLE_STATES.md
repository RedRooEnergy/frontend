EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: Lifecycle States
STATUS: GOVERNANCE DRAFT

DEFINED STATES

DRAFT
- Product exists only in supplier scope
- Editable
- Not visible to buyers
- No pricing execution permitted

SUBMITTED
- Supplier has submitted catalogue entry for review
- Read-only for supplier
- Awaiting validation
- Audit event required on submission

REJECTED
- Validation failed
- Returned to supplier
- Editable again
- Rejection reason mandatory and auditable

APPROVED
- Validation complete
- Awaiting publication
- Immutable except via Change Control

PUBLISHED
- Buyer-visible
- Immutable
- Becomes audit-authoritative
- Any modification requires new version

ARCHIVED
- Removed from buyer view
- Retained for audit and reporting
- Immutable

LIFECYCLE RULES

- State transitions are one-directional except REJECTED → DRAFT
- No direct transition to PUBLISHED
- No deletion of catalogue records
- All transitions emit audit events
