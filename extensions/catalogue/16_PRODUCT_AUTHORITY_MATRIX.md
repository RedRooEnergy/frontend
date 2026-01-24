# EXT-05 — Product Authority Matrix

Status: GOVERNANCE DRAFT

Actors:
- SUPPLIER
- COMPLIANCE_AUTHORITY
- ADMIN
- SYSTEM

Authority by Action:

Create Draft:
- SUPPLIER

Edit Draft:
- SUPPLIER

Submit Product:
- SUPPLIER

Compliance Review:
- COMPLIANCE_AUTHORITY

Approve / Reject:
- COMPLIANCE_AUTHORITY

Publish Product:
- SYSTEM (triggered by approval)

Suspend Product:
- ADMIN
- SYSTEM (compliance breach)

Reinstate Product:
- ADMIN
- SYSTEM

Retire Product:
- ADMIN
- SYSTEM

Rules:
- SUPPLIER has no authority once product is SUBMITTED
- COMPLIANCE_AUTHORITY decisions are final and audited
- ADMIN cannot override compliance approval
- SYSTEM actions must be deterministic and auditable
- Every authority action emits an audit event
- Unauthorized actions must hard-fail

