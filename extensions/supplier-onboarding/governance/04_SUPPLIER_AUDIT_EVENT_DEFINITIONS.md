# Supplier Onboarding Extension — Audit Event Definitions

## Purpose
Define the mandatory audit events emitted by the Supplier Onboarding Extension (EXT-01).

These events are **non-optional** and must comply with Core audit contracts.

---

## General Audit Rules

All audit events MUST include:

- eventId (deterministic)
- timestamp (UTC, ISO-8601)
- scope (DATA_MUTATION or GOVERNANCE)
- actorId
- role
- requestId
- resourceType = SUPPLIER
- resourceId
- outcome (ALLOW / DENY)
- severity (INFO / WARN / CRITICAL)

Events are immutable once recorded.

---

## Required Audit Events

### SUPPLIER_CREATED

Emitted when a supplier record is first created.

- Trigger: Initial supplier registration
- Actor: SUPPLIER
- Severity: INFO
- Scope: DATA_MUTATION

---

### SUPPLIER_SUBMITTED

Emitted when a supplier submits onboarding data.

- Trigger: DRAFT → SUBMITTED
- Actor: SUPPLIER
- Severity: INFO
- Scope: DATA_MUTATION

---

### SUPPLIER_REVIEW_STARTED

Emitted when review begins.

- Trigger: SUBMITTED → UNDER_REVIEW
- Actor: SYSTEM
- Severity: INFO
- Scope: GOVERNANCE

---

### SUPPLIER_APPROVED

Emitted when supplier is approved.

- Trigger: UNDER_REVIEW → APPROVED
- Actor: COMPLIANCE_AUTHORITY
- Severity: INFO
- Scope: GOVERNANCE

---

### SUPPLIER_REJECTED

Emitted when supplier is rejected.

- Trigger: UNDER_REVIEW → REJECTED
- Actor: COMPLIANCE_AUTHORITY
- Severity: WARN
- Scope: GOVERNANCE

---

### SUPPLIER_SUSPENDED

Emitted when supplier access is suspended.

- Trigger: APPROVED → SUSPENDED
- Actor: COMPLIANCE_AUTHORITY
- Severity: WARN
- Scope: GOVERNANCE

---

### SUPPLIER_REVOKED

Emitted when supplier is permanently revoked.

- Trigger: APPROVED → REVOKED
- Actor: COMPLIANCE_AUTHORITY
- Severity: CRITICAL
- Scope: GOVERNANCE

---

### SUPPLIER_REINSTATED

Emitted when a suspended supplier is reinstated.

- Trigger: SUSPENDED → APPROVED
- Actor: COMPLIANCE_AUTHORITY
- Severity: INFO
- Scope: GOVERNANCE

---

## Forbidden Conditions

The following MUST emit a CRITICAL audit event and fail the request:

- Missing requestId
- Missing actor context
- Attempted forbidden state transition
- Any mutation without audit emission

---

## Change Control

This document is frozen once EXT-01 is activated.

Changes require:
- Approved CCR
- Extension version increment
- Registry update
