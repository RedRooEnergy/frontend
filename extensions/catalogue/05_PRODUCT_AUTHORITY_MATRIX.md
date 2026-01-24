# EXT-05 — Product Authority Matrix

Status: GOVERNANCE DRAFT

Roles:
- SUPPLIER
- COMPLIANCE_AUTHORITY
- ADMIN
- SYSTEM

Authority by Action:

Create Draft:
- SUPPLIER

Edit Draft:
- SUPPLIER (own products only)

Submit Product:
- SUPPLIER

Compliance Review:
- COMPLIANCE_AUTHORITY

Approve / Reject:
- COMPLIANCE_AUTHORITY

Publish:
- SYSTEM (after approval only)

Suspend:
- ADMIN | SYSTEM

Retire:
- ADMIN | SYSTEM

Rules:
- Suppliers cannot approve or publish
- Admin cannot bypass compliance approval
- System actions must be auditable
- All authority checks are server-side enforced

