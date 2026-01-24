EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: Audit Events Definition
STATUS: GOVERNANCE DRAFT

AUDIT SCOPE
DATA_MUTATION

EVENTS

CATALOGUE_DRAFT_CREATED
- Actor: SUPPLIER
- Trigger: New catalogue draft created
- Scope: DATA_MUTATION
- Outcome: ALLOW

CATALOGUE_DRAFT_UPDATED
- Actor: SUPPLIER
- Trigger: Draft edited
- Scope: DATA_MUTATION
- Outcome: ALLOW

CATALOGUE_SUBMITTED
- Actor: SUPPLIER
- Trigger: Draft submitted for review
- Scope: GOVERNANCE
- Outcome: ALLOW

CATALOGUE_REJECTED
- Actor: COMPLIANCE_AUTHORITY
- Trigger: Submission rejected
- Scope: GOVERNANCE
- Outcome: DENY

CATALOGUE_APPROVED
- Actor: COMPLIANCE_AUTHORITY
- Trigger: Submission approved
- Scope: GOVERNANCE
- Outcome: ALLOW

CATALOGUE_PUBLISHED
- Actor: ADMINISTRATOR
- Trigger: Approved catalogue published
- Scope: GOVERNANCE
- Outcome: ALLOW

CATALOGUE_ARCHIVED
- Actor: ADMINISTRATOR
- Trigger: Catalogue archived
- Scope: GOVERNANCE
- Outcome: ALLOW

ENFORCEMENT RULES

- All events require requestId
- All events require actor context
- Events are immutable once emitted
- Events must be emitted before state transition completion
