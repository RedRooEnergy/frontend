# EXT-08 — Governance Artefacts & Role Definition

Status: GOVERNANCE DRAFT
Extension: EXT-08 — Service Partner Experience & Workflow
Implementation: NOT AUTHORIZED

## Role Definition

### Service Partner (SP)
A Service Partner is a non-buyer, non-supplier operational actor
authorised to perform delegated tasks within the RedRooEnergy marketplace.

Service Partners may include (non-exhaustive):
- Accredited installers
- Licensed electricians
- Freight and logistics handlers
- Compliance evidence collectors
- Inspection and verification agents

Service Partners do not own transactions, pricing, or compliance outcomes.

## Authority Boundaries

Service Partners MAY:
- View assigned tasks and jobs
- Submit required evidence and artefacts
- Acknowledge task completion
- View task-related status and instructions

Service Partners MAY NOT:
- Modify Core state directly
- Approve or reject compliance
- Alter pricing, payments, escrow, or settlement
- Act on behalf of Buyers or Suppliers
- Escalate privileges beyond assigned scope

## Governance Artefacts (Required)

The following artefacts govern EXT-08 and are mandatory:

- EXTENSION_DEFINITION.md
- GOVERNANCE_AND_ROLES.md
- EXTENSION_LOCK.md (future)
- VERIFICATION_CHECKLIST.md (future)
- EXTENSION_CLOSED.md (future)

No implementation may proceed until all governance artefacts
are completed and formally authorised.

## Audit & Evidence

All Service Partner actions are:
- Individually attributable
- Timestamped
- Logged to the Core audit pipeline
- Non-repudiable

Evidence submissions are append-only.
Deletion, replacement, or mutation is not permitted.

## Identity & Auth

- Role: ServicePartner (Core-defined)
- Scope: Task-scoped, least-privilege
- Default deny enforced
- Explicit assignment required

No dynamic role elevation is permitted.

## Change Control

Once EXT-08 enters implementation,
all changes require a Change Control Request (CCR).
Governance artefacts become immutable upon lock.



Validation Checklist:

Role boundaries are explicit

No authority overlap with Buyer/Supplier

Governance artefacts enumerated

Default-deny principle preserved

No implementation implied

