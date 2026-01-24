# EXT-09 — Compliance Authority Experience & Decision Workflows

Status: GOVERNANCE DRAFT
Governance Phase: DEFINITION
Implementation: NOT AUTHORIZED

## Purpose
EXT-09 defines the Compliance Authority–facing experience within the RedRooEnergy marketplace.
It provides regulated decision-making interfaces for authorised compliance authorities
to assess, approve, reject, suspend, or revoke compliance states under law and policy.

This extension is the only extension permitted to issue compliance decisions.

## In Scope
- Review of compliance submissions and evidence
- Compliance decision actions (approve, reject, suspend, revoke)
- Issuance of formal compliance outcomes
- Decision rationale capture
- Audit event emission for all decisions
- Regulator-facing visibility and controls

## Out of Scope
- Core modifications
- Pricing, payments, escrow, or settlement
- Buyer or Supplier UI
- Evidence submission (handled by EXT-08 / Core)
- Task assignment or operational workflows

## Governance Rules
- Compliance Authority decisions are authoritative
- Decisions must be explicit and attributable
- All decisions are auditable and immutable
- Default deny applies to all actions
- No implied or automatic approvals

## Dependencies
- Immutable Core (Identity, Auth, Audit, State Enforcement)
- Compliance records and evidence (Core-owned)
- Document and evidence repositories (Core-owned)

## Change Control
Once authorised, all changes require a formal Change Control Request (CCR).



Validation Checklist:

Extension purpose is explicit and regulator-focused

Decision authority clearly defined

Scope boundaries clear and non-overlapping

No implementation implied

Governance-first positioning preserved

