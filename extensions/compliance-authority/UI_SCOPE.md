# EXT-09 — Compliance Authority UI Scope

Status: GOVERNANCE DRAFT
Extension: EXT-09 — Compliance Authority Experience & Decision Workflows
Implementation: NOT AUTHORIZED

## Purpose

This document defines the authorised user-interface scope
for Compliance Authorities operating under EXT-09.

The UI enables regulated review and explicit decision-making
without granting authority beyond compliance determination.

## Core UI Principles

- Decision-driven, not operational
- Explicit actions only
- No automation or implied outcomes
- No bulk or silent decisions
- Every action emits an audit event

## Permitted Views (Read-Only)

Compliance Authorities MAY view:

- Open and historical compliance cases
- Case metadata and trigger context
- Submitted evidence and artefacts
- Prior decisions and decision history
- Current compliance state
- Affected entity references

Views do not expose:
- Pricing or commercial margins
- Payment or settlement data
- Buyer personal data beyond regulatory necessity
- Internal supplier operational data

## Permitted Actions (Explicit Decisions)

Compliance Authorities MAY perform:

- Approve compliance
- Reject compliance
- Suspend compliance
- Revoke compliance
- Request remediation or resubmission (signal only)

All actions:
- Require explicit confirmation
- Require rationale or reason code
- Are attributable to an authority identity
- Are final once issued

## Prohibited Actions

Compliance Authorities MAY NOT:

- Submit or modify evidence
- Edit or delete past decisions
- Override audit records
- Bypass required evidence
- Perform operational or financial actions

## UI Constraints

- No bulk decision buttons
- No auto-approval or default approval
- No optimistic UI
- Decision confirmation required
- Clear display of authority level

## Audit Requirements

Every UI action must:
- Emit a compliance decision audit event
- Record authority identity
- Capture rationale or reason code
- Be timestamped and immutable

## Accessibility & Integrity

- Clear role labelling
- Explicit decision impact warnings
- Fail-closed error handling
- Regulator-ready traceability



Validation Checklist:

UI scope bounded to decision authority

No operational leakage

Explicit decision-only actions

Audit and immutability enforced

Core authority preserved

