# EXT-08 — Audit Events & Observability

Status: GOVERNANCE DRAFT
Extension: EXT-08 — Service Partner Experience & Workflow
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory audit and observability requirements
for all Service Partner actions performed under EXT-08.

Audit and observability are first-class governance controls.

## Core Principles

- Every Service Partner action is auditable
- No action is silent
- Events are observational, not directive
- Audit trails are immutable
- Observability supports forensic reconstruction

## Audit Event Categories

The following audit event categories MUST be emitted:

### Identity & Access
- SERVICE_PARTNER_AUTHENTICATED
- SERVICE_PARTNER_SESSION_STARTED
- SERVICE_PARTNER_SESSION_ENDED
- SERVICE_PARTNER_ACCESS_DENIED

### Task & Assignment Interaction
- SERVICE_PARTNER_TASK_VIEWED
- SERVICE_PARTNER_ASSIGNMENT_ACKNOWLEDGED
- SERVICE_PARTNER_TASK_STATUS_VIEWED

### Evidence Submission
- SERVICE_PARTNER_EVIDENCE_UPLOAD_STARTED
- SERVICE_PARTNER_EVIDENCE_UPLOAD_COMPLETED
- SERVICE_PARTNER_EVIDENCE_UPLOAD_FAILED

### Completion Signals
- SERVICE_PARTNER_TASK_COMPLETION_ACKNOWLEDGED

## Mandatory Audit Fields

Every audit event MUST include:
- Event ID
- Event Type
- Timestamp (UTC)
- Service Partner ID
- Assignment ID (if applicable)
- Task ID (if applicable)
- Source (UI / API)
- Outcome (SUCCESS / FAILURE)

## Observability Requirements

The system MUST support:
- Chronological reconstruction of Service Partner actions
- Correlation of events to tasks and assignments
- Identification of failed or denied actions
- Separation of attempted vs completed actions

## Prohibited Behaviour

Audit events MUST NOT:
- Trigger workflow changes
- Modify Core state
- Imply approval or acceptance
- Be suppressed or batched in a way that loses fidelity

## Failure Handling

- Audit emission failures fail closed
- Actions without audit emission are invalid
- Partial audit records are not permitted

## Retention & Access

- Audit records are retained per Core policy
- Audit access is restricted to authorised roles
- Service Partners cannot modify or delete audit records

## Out of Scope

- Logging infrastructure
- SIEM integration
- Alerting thresholds
- Monitoring dashboards

These remain Core responsibilities.



Validation Checklist:

Audit events enumerated

Mandatory fields explicit

Observability requirements defined

No workflow coupling introduced

Core authority preserved

