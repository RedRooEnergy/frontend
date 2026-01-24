# EXT-05 — Catalogue Authority Matrix

Status: GOVERNANCE DRAFT

Roles:
- Supplier
- Compliance Authority
- Administrator
- System

Permissions by Role:

Supplier:
- Create DRAFT products
- Edit DRAFT products
- Submit products for review

Compliance Authority:
- Review SUBMITTED products
- Validate certifications
- Approve or reject compliance

Administrator:
- Publish APPROVED products
- Suspend or retire products
- Override visibility in exceptional cases (audited)

System:
- Enforce state transitions
- Block invalid actions
- Emit audit events

Rules:
- No role may bypass lifecycle states
- All overrides require audit logging
- Default-deny applies to all unspecified actions

