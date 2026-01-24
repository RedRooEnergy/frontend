EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: Audit Events
STATUS: GOVERNANCE DRAFT

AUDIT PRINCIPLES

- All catalogue state changes are auditable events
- Events are append-only
- No mutation or deletion of audit records
- Audit events reference Core-issued requestId and actor

AUDIT SCOPE

Scope: DATA_MUTATION

ACTORS

- Supplier
- Administrator
- ComplianceAuthority
- System

EVENT DEFINITIONS

CATALOGUE_DRAFT_CREATED
- Actor: Supplier
- Trigger: CreateCatalogueDraft
- Outcome: ALLOW / DENY
- Severity: INFO

CATALOGUE_SUBMITTED
- Actor: Supplier
- Trigger: SubmitCatalogue
- Outcome: ALLOW / DENY
- Severity: INFO

CATALOGUE_APPROVED
- Actor: Administrator | ComplianceAuthority
- Trigger: ApproveCatalogue
- Outcome: ALLOW
- Severity: INFO

CATALOGUE_REJECTED
- Actor: Administrator | ComplianceAuthority
- Trigger: RejectCatalogue
- Outcome: ALLOW
- Severity: WARN

CATALOGUE_PUBLISHED
- Actor: Administrator | System
- Trigger: PublishCatalogue
- Outcome: ALLOW
- Severity: INFO

CATALOGUE_ARCHIVED
- Actor: Administrator | System
- Trigger: ArchiveCatalogue
- Outcome: ALLOW
- Severity: INFO

MANDATORY FIELDS

- eventId
- timestamp
- requestId
- actorId
- actorRole
- action
- resource
- outcome
- severity

PROHIBITIONS

- No silent state changes
- No write operations without audit emission
- No audit bypass by extensions
