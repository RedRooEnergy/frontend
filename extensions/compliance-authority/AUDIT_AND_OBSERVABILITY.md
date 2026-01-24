# EXT-09 — Audit Events & Decision Observability

Status: GOVERNANCE DRAFT
Extension: EXT-09 — Compliance Authority Experience & Decision Workflows
Implementation: NOT AUTHORIZED

## Purpose

This document defines mandatory audit and observability requirements
for all Compliance Authority actions and decisions under EXT-09.

Audit integrity and decision traceability are regulatory obligations.

## Core Principles

- Every compliance action is auditable
- No decision is silent or implicit
- Audit records are immutable
- Observability enables full forensic reconstruction
- Decision accountability is explicit

## Audit Event Categories

The following audit event categories MUST be emitted:

### Identity & Access
- COMPLIANCE_AUTHORITY_AUTHENTICATED
- COMPLIANCE_AUTHORITY_SESSION_STARTED
- COMPLIANCE_AUTHORITY_SESSION_ENDED
- COMPLIANCE_AUTHORITY_ACCESS_DENIED

### Case Interaction
- COMPLIANCE_CASE_VIEWED
- COMPLIANCE_EVIDENCE_VIEWED
- COMPLIANCE_CASE_STATUS_VIEWED

### Decision Actions
- COMPLIANCE_DECISION_ISSUED
- COMPLIANCE_DECISION_APPROVED
- COMPLIANCE_DECISION_REJECTED
- COMPLIANCE_DECISION_SUSPENDED
- COMPLIANCE_DECISION_REVOKED
- COMPLIANCE_REMEDIATION_REQUESTED

### Failure & Exception
- COMPLIANCE_DECISION_FAILED
- COMPLIANCE_DECISION_BLOCKED

## Mandatory Audit Fields

Every audit event MUST include:
- Event ID
- Event Type
- Timestamp (UTC)
- Compliance Authority ID
- Authority Level
- Compliance Case ID
- Decision ID (if applicable)
- Outcome (SUCCESS / FAILURE)
- Source (UI / API)

## Decision Observability

The system MUST support:
- Chronological reconstruction of decisions
- Visibility of decision history per case
- Correlation of evidence reviewed to decisions issued
- Identification of authority level used
- Clear distinction between attempted and completed decisions

## Prohibited Behaviour

Audit events MUST NOT:
- Be suppressed or delayed
- Be altered after emission
- Trigger workflow side-effects directly
- Imply outcomes not explicitly decided

## Failure Handling

- Decision attempts without audit emission are invalid
- Partial audit records are not permitted
- Failed decisions must emit failure events
- System errors fail closed

## Retention & Access

- Audit records retained per Core policy
- Regulator access supported
- Compliance Authorities cannot modify or delete audit records
- Audit access is role-restricted

## Out of Scope

- Logging infrastructure
- SIEM integration
- Alerting thresholds
- Monitoring dashboards

These remain Core responsibilities.



Validation Checklist:

Decision audit events enumerated

Mandatory fields explicit

Observability requirements regulator-ready

No workflow coupling introduced

Core authority preserved

