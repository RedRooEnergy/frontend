# EXT-06 — Logistics Authority Matrix

Status: GOVERNANCE DRAFT

Roles and Authorities:

SYSTEM
- Calculate DDP pricing
- Bind pricing snapshot
- Emit audit events
- Enforce state transitions

SUPPLIER
- Provide shipment dimensions and weights
- Confirm readiness for dispatch
- Upload commercial invoice and packing list

LOGISTICS_PROVIDER
- Accept booking
- Provide tracking references
- Update in-transit milestones

COMPLIANCE_AUTHORITY
- Review customs exceptions
- Approve or reject clearance actions

ADMIN
- View logistics state
- Trigger exception workflows
- Cannot bypass state rules

Rules:
- No role may modify pricing snapshots
- No manual state overrides are permitted
- All authority actions must be auditable
- SYSTEM actions are deterministic and non-interactive

