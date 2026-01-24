# EXT-05 — Product Authority Matrix

Status: GOVERNANCE DRAFT

Roles:
- SUPPLIER
- COMPLIANCE_AUTHORITY
- ADMIN
- SYSTEM

Permissions by Role:

SUPPLIER:
- Create product draft
- Edit product in DRAFT
- Submit product for compliance
- Withdraw own product (pre-publication)

COMPLIANCE_AUTHORITY:
- Review compliance evidence
- Set COMPLIANCE_REQUIRED
- Mark product COMPLIANT
- Suspend non-compliant products

ADMIN:
- Override publication (with audit)
- Suspend or reinstate products
- Enforce emergency takedown

SYSTEM:
- Enforce lifecycle transitions
- Prevent invalid state changes
- Emit mandatory audit events

Constraints:
- No role may bypass lifecycle rules
- ADMIN overrides require justification
- SYSTEM actions are non-interactive

Audit:
- All authority actions are audited
- Actor, role, productId, and reason required

