# EXT-08 — Evidence Submission Rules

Status: GOVERNANCE DRAFT
Extension: EXT-08 — Service Partner Experience & Workflow
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory rules for evidence submission
by Service Partners under EXT-08.

Evidence is treated as a regulated, auditable artefact.
These rules are non-negotiable.

## Core Principles

- Evidence is append-only
- Evidence is immutable once submitted
- Evidence submission does not imply approval
- Core remains the authority on acceptance and outcomes
- Every submission is auditable and attributable

## Evidence Definition

Evidence refers to any artefact submitted by a Service Partner
to demonstrate completion or progress of a delegated task.

Examples (non-exhaustive):
- Photographs
- Installation certificates
- Inspection reports
- Freight documentation
- Compliance-related attestations

## Submission Rules

Service Partners MAY:
- Submit evidence explicitly requested by a task
- Submit evidence only for tasks they are assigned to
- Submit multiple artefacts if required

Service Partners MAY NOT:
- Edit submitted evidence
- Delete submitted evidence
- Replace evidence
- Submit evidence for unassigned tasks
- Submit evidence outside defined task requirements

## Immutability & Retention

- All evidence is immutable once stored
- Corrections are handled by submitting additional evidence
- No overwrite or version replacement is permitted
- Retention is governed by Core retention policy

## Attribution & Audit

Every evidence submission must record:
- Evidence ID
- Task ID
- Assignment ID
- Service Partner ID
- Timestamp
- Evidence type
- Submission context (UI, API)

All submissions must emit an audit event.

## Failure Handling

- Invalid submissions fail closed
- Partial uploads are rejected
- No silent acceptance
- Errors must be explicit and logged

## Out of Scope

- Evidence storage technology
- File formats or size limits
- Malware scanning
- Approval workflows
- Compliance decision logic

These are Core responsibilities.



Validation Checklist:

Append-only rule explicit

Immutability enforced conceptually

No implied approval logic

Audit and attribution mandatory

Core authority preserved

