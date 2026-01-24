EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: Authorization Rules
STATUS: GOVERNANCE DRAFT

AUTHORIZATION MODEL

- Default-deny applies at all times
- Explicit allow rules only
- Authorization evaluated after identity binding
- Core authorization middleware is authoritative

ROLES

- Supplier
- Administrator
- ComplianceAuthority
- System

ALLOW RULES

CreateCatalogueDraft
- Role: Supplier
- Condition: Supplier is active and not suspended

EditCatalogueDraft
- Role: Supplier
- Condition: Draft status = DRAFT

SubmitCatalogue
- Role: Supplier
- Condition: Draft status = DRAFT

ApproveCatalogue
- Role: Administrator | ComplianceAuthority
- Condition: Draft status = SUBMITTED

RejectCatalogue
- Role: Administrator | ComplianceAuthority
- Condition: Draft status = SUBMITTED

PublishCatalogue
- Role: Administrator | System
- Condition: Catalogue status = APPROVED

ArchiveCatalogue
- Role: Administrator | System
- Condition: Catalogue status = PUBLISHED

DENY RULES

- Any role not explicitly listed
- Any state transition not defined above
- Any attempt to bypass workflow states
- Any request without valid requestId

ERROR HANDLING

- All denials return AUTH_DENIED
- No internal details exposed to client
- requestId must be returned on error

PROHIBITIONS

- No role escalation
- No implicit permissions
- No configuration-based overrides
