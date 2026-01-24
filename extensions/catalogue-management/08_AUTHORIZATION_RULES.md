EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: Authorization Rules
STATUS: GOVERNANCE DRAFT

ROLES

- SYSTEM
- ADMIN
- SUPPLIER
- COMPLIANCE_AUTHORITY
- READ_ONLY_AUDITOR

GLOBAL RULES

- Default-deny applies to all routes and actions
- Authorization is evaluated per request using ActorContext
- No role escalation is permitted
- Extensions may not bypass Core authorization middleware

ROLE PERMISSIONS

SYSTEM
- Internal lifecycle transitions
- Hash issuance on publish
- Audit emission only

ADMIN
- Approve or reject catalogues
- Archive catalogues
- View all catalogue states

SUPPLIER
- Create catalogue drafts
- Edit catalogue while status = DRAFT
- Submit catalogue for approval
- View own catalogues only

COMPLIANCE_AUTHORITY
- Attach compliance decisions
- Block approval on compliance failure
- View catalogue compliance bundle

READ_ONLY_AUDITOR
- Read-only access to all catalogue states
- No mutation rights

PROHIBITED ACTIONS

- Suppliers may not publish directly
- Admin may not modify catalogue content
- No role may mutate a PUBLISHED catalogue
- No cross-supplier access permitted

AUDIT REQUIREMENTS

- All denied actions must emit audit events
- All approvals, rejections, and publishes are audit-mandatory
