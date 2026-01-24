# EXT-07 — Buyer Authority Matrix

Status: GOVERNANCE DRAFT

Actors:
- Buyer
- Administrator
- System

Permissions:

Buyer:
- Create account
- View own orders
- Submit returns
- View documents

Administrator:
- Suspend buyer
- Reinstate buyer
- Close buyer account
- View audit history

System:
- Enforce lifecycle rules
- Emit audit events
- Block unauthorized actions

Rules:
- Buyers may act only on their own records
- Administrators may not bypass lifecycle constraints
- System actions are immutable and auditable

