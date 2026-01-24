EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: Authority & Role Matrix
STATUS: GOVERNANCE DRAFT

ROLES

SUPPLIER
- Create catalogue drafts
- Edit DRAFT and REJECTED states only
- Submit catalogue for review
- Cannot approve, publish, or archive

COMPLIANCE AUTHORITY
- Review SUBMITTED catalogue entries
- Validate certifications and attributes
- Approve or reject submissions
- Must provide auditable reasons on rejection

ADMINISTRATOR
- Publish APPROVED catalogue entries
- Archive PUBLISHED entries
- Cannot modify product content
- Cannot bypass lifecycle rules

SYSTEM
- Enforce lifecycle transitions
- Emit audit events
- Prevent unauthorised state changes
- Enforce immutability

AUTHORITY RULES

- No role may act outside its defined state authority
- No role may bypass lifecycle enforcement
- All authority actions are auditable
- Default-deny applies to all unspecified actions
