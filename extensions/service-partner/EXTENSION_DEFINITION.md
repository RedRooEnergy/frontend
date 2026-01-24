# EXT-08 — Service Partner Experience & Workflow

Status: GOVERNANCE DRAFT
Governance Phase: DEFINITION
Implementation: NOT AUTHORIZED

## Purpose
EXT-08 defines the service-partner-facing experience within the RedRooEnergy marketplace.
Service Partners include installers, electricians, freight handlers, compliance agents,
and other approved operational partners.

This extension provides visibility, task workflows, and evidence submission interfaces
for Service Partners without granting authority over Core state.

## In Scope
- Read-only visibility of assigned jobs and tasks
- Submission of evidence and completion artefacts
- Status acknowledgement (not decision-making)
- Audit event emission for all partner actions
- Role-scoped UI and routes

## Out of Scope
- Core modifications
- Pricing, payments, escrow, or settlement
- Compliance approval or rejection
- Buyer or Supplier impersonation
- State mutation outside approved task artefacts

## Governance Rules
- Core remains the sole source of truth
- Service Partners operate under delegated, scoped authority only
- All actions are auditable
- No implicit permissions
- Default deny applies

## Dependencies
- Immutable Core (Identity, Auth, Audit)
- Task and Assignment models (Core-owned)
- Document and Evidence handling (Core-owned)

## Change Control
Once authorised, all changes require a formal Change Control Request (CCR).



Validation Checklist:

Extension purpose is explicit

Scope boundaries clearly defined

No implementation implied

No authority escalation introduced

Governance-first positioning preserved

