# EXT-06 — Logistics Authority Matrix

Status: GOVERNANCE DRAFT

Roles & Authority:

SYSTEM
- Emit logistics audit events
- Enforce lifecycle transitions
- Enforce immutability

SUPPLIER
- Submit shipment details
- Upload required logistics documents
- Cannot alter pricing or snapshots

LOGISTICS_PROVIDER
- Update tracking milestones
- Confirm booking and delivery events
- Cannot modify shipment pricing

COMPLIANCE_AUTHORITY
- Review customs exceptions
- Approve clearance or flag failure

ADMIN
- Oversight only
- No direct modification of shipment state

Rules:
- No role may bypass lifecycle rules
- All actions are audited
- Authority is role-bound and immutable

