EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: Audit Events
STATUS: GOVERNANCE DRAFT

AUDIT SCOPE

Scope value:
CATALOGUE_MANAGEMENT

All events below MUST:
- Include requestId
- Include actorId and role
- Include catalogueId (where applicable)
- Be immutable once emitted

EVENTS

CAT-01 — CATALOGUE_DRAFT_CREATED
Scope: CATALOGUE_MANAGEMENT
Severity: INFO
Emitted when a supplier creates a new catalogue draft.

CAT-02 — CATALOGUE_DRAFT_UPDATED
Scope: CATALOGUE_MANAGEMENT
Severity: INFO
Emitted when a draft is modified.

CAT-03 — CATALOGUE_DRAFT_SUBMITTED
Scope: CATALOGUE_MANAGEMENT
Severity: INFO
Emitted when a draft is submitted for review.

CAT-04 — CATALOGUE_REVIEW_APPROVED
Scope: CATALOGUE_MANAGEMENT
Severity: CRITICAL
Emitted when an admin approves a draft for publication.

CAT-05 — CATALOGUE_REVIEW_REJECTED
Scope: CATALOGUE_MANAGEMENT
Severity: WARNING
Emitted when an admin rejects a draft.

CAT-06 — CATALOGUE_PUBLISHED
Scope: CATALOGUE_MANAGEMENT
Severity: CRITICAL
Emitted when a catalogue becomes publicly visible.

CAT-07 — CATALOGUE_ARCHIVED
Scope: CATALOGUE_MANAGEMENT
Severity: INFO
Emitted when a catalogue is archived.

FORBIDDEN

- No audit event may be skipped
- No mutation may occur without an audit event
- Audit payloads may not be altered post-emission
