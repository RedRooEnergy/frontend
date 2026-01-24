# EXT-08 — Service Partner UI Scope

Status: GOVERNANCE DRAFT
Extension: EXT-08 — Service Partner Experience & Workflow
Implementation: NOT AUTHORIZED

## Purpose

This document defines the permitted user-interface scope
for Service Partners operating under EXT-08.

The UI reflects Core-assigned tasks and enables evidence submission
without granting authority over system state.

## Core UI Principles

- Read-only by default
- Explicit, scoped actions only
- No inferred or calculated state
- No override of Core truth
- Every action emits an audit event

## Permitted Views (Read-Only)

Service Partners MAY view:

- Assigned tasks list
- Individual task detail
- Task instructions and requirements
- Required evidence types
- Submission history (own submissions)
- Task and assignment status
- Related entity references (order ID, shipment ID)

Views do not expose:
- Pricing or margins
- Buyer personal data beyond necessity
- Supplier internal data
- Compliance decision logic

## Permitted Actions (Explicit & Scoped)

Service Partners MAY perform:

- Acknowledge assignment
- Upload required evidence artefacts
- Mark evidence submission complete
- Acknowledge task completion (signal only)

These actions:
- Do not complete tasks directly
- Do not approve compliance
- Do not trigger payments or settlement
- Do not alter Core-owned state

## Prohibited Actions

Service Partners MAY NOT:

- Create or delete tasks
- Modify task requirements
- Approve or reject compliance
- Edit or delete submitted evidence
- Change task state beyond acknowledgement
- Act on behalf of Buyers or Suppliers

## UI Constraints

- No bulk actions
- No background automation
- No hidden state transitions
- No optimistic UI updates
- UI always reflects server response

## Audit Requirements

Every UI action must:
- Be attributable to a Service Partner
- Be timestamped
- Emit an audit event
- Be replayable for forensic review

## Accessibility & Integrity

- Clear role labelling
- Explicit task ownership display
- Error states must fail closed
- No silent failures



Validation Checklist:

UI scope is explicitly bounded

Read-only default enforced

Actions are scoped and non-authoritative

No Core responsibility leakage

Audit requirements explicit

