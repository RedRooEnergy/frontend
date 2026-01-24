# EXT-15 — Audit Events & Case Lifecycle Observability

Status: GOVERNANCE DRAFT
Extension: EXT-15 — Returns, Refunds & Dispute Management
Implementation: NOT AUTHORIZED

## Purpose

This document defines mandatory audit and observability requirements
for all return, refund, and dispute case lifecycle actions under EXT-15.

Case handling is a regulated, forensic-grade process.

## Core Principles

- Every case action is auditable
- No case lifecycle step is silent
- Audit records are immutable
- Observability enables regulatory and forensic reconstruction
- Case coordination does not imply authority

## Case Lifecycle Events

The following audit events MUST be emitted:

### Case Creation & Intake
- CASE_CREATED
- CASE_CREATION_FAILED

### State Transitions
- CASE_STATE_CHANGED
- CASE_STATE_CHANGE_DENIED

### Evidence Handling
- CASE_EVIDENCE_REQUESTED
- CASE_EVIDENCE_UPLOAD_ATTEMPTED
- CASE_EVIDENCE_SUBMITTED
- CASE_EVIDENCE_REJECTED
- CASE_EVIDENCE_ACCESSED

### Policy Evaluation
- RETURN_POLICY_EVALUATED
- RETURN_POLICY_DENIED
- REFUND_POLICY_EVALUATED
- REFUND_POLICY_DENIED

### Escalation & Handover
- CASE_ESCALATED
- CASE_HANDOVER_TO_FINANCE
- CASE_HANDOVER_TO_COMPLIANCE

### Resolution & Closure
- CASE_DECISION_RECORDED
- CASE_RESOLVED
- CASE_CLOSED

### Failure & Policy Violation
- CASE_MUTATION_ATTEMPTED
- CASE_UNAUTHORISED_ACTION
- CASE_POLICY_VIOLATION

## Mandatory Audit Fields

Every audit event MUST include:
- Event ID
- Event Type
- Timestamp (UTC)
- Case ID
- Case Type
- Actor Identity and Role
- Action Source (UI / API / SYSTEM)
- Previous State (if applicable)
- New State (if applicable)
- Outcome (SUCCESS / FAILURE / DENIED)

## Observability Requirements

The system MUST support:
- Chronological reconstruction of full case history
- Traceability from case creation to closure
- Correlation of evidence, policy evaluation, and authority decisions
- Identification of denied or failed actions
- Separation of coordination actions vs authority decisions

## Prohibited Behaviour

Audit events MUST NOT:
- Be suppressed or delayed
- Be altered after emission
- Be generated without an underlying action
- Mask denied or failed operations

## Failure Handling

- Any case action without audit emission is invalid
- Partial audit records are prohibited
- Failed or denied actions must emit failure events
- System errors fail closed

## Retention & Access

- Case audit records retained per Core evidence doctrine
- Regulator and auditor access supported
- Users cannot modify or delete audit records
- Audit access is role-restricted

## Out of Scope

- Audit storage implementation
- SIEM or monitoring integration
- Alerting on audit events
- Case analytics dashboards

These are handled by Core or EXT-12.



Validation Checklist:

Full case lifecycle auditable

Mandatory fields explicit

Coordination vs authority separation clear

Policy violation visibility enforced

No workflow coupling introduced
