# EXT-09 — Auth Boundaries & Authority Level Enforcement

Status: GOVERNANCE DRAFT
Extension: EXT-09 — Compliance Authority Experience & Decision Workflows
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory authentication, authorisation,
and authority-level enforcement rules governing Compliance Authorities.

These rules are enforced by Core and consumed by EXT-09.

## Core Principles

- Default deny
- Explicit role assignment
- Explicit authority level enforcement
- Least-privilege decision scope
- No implicit or inferred authority

## Identity Requirements

All Compliance Authority access requires:
- Authenticated identity
- Role explicitly set to ComplianceAuthority
- Active authority status
- Valid session context

Unauthenticated access is denied.

## Authority Level Enforcement

Compliance Authorities operate under a declared authority level.

Authority levels define which decisions may be issued:

Conceptual examples:
- CA_L1: Review, recommendation, remediation request
- CA_L2: Approval, rejection
- CA_L3: Suspension, revocation

Authority level:
- Is explicitly assigned by Core
- Is non-transferable
- Cannot be escalated dynamically
- Is validated on every decision action

Absence or mismatch of authority level results in denial.

## Scope & Case Binding

All Compliance Authority actions MUST be:
- Bound to a specific compliance case
- Validated against case state
- Rejected if the case is closed or inactive

No global or unscoped decision actions are permitted.

## Prohibited Behaviour

Compliance Authorities MUST NOT:
- Act outside assigned authority level
- Bypass evidence review requirements
- Issue decisions without rationale
- Modify or delete prior decisions
- Override audit emission

## Failure Handling

- Auth failures return explicit denial
- Authority-level failures return explicit denial
- Decision attempts fail closed
- No silent fallback or partial success

## Audit Requirements

All auth and authority checks MUST emit audit events:
- COMPLIANCE_AUTHORITY_ACCESS_GRANTED
- COMPLIANCE_AUTHORITY_ACCESS_DENIED
- COMPLIANCE_AUTHORITY_AUTHORITY_MISMATCH

Audit records are immutable.

## Out of Scope

- Authority provisioning workflows
- Role assignment processes
- Authority escalation handling
- Credential lifecycle management

These remain Core responsibilities.



Validation Checklist:

Default deny enforced

Authority levels explicitly bounded

Case binding mandatory

No implicit decision paths

Audit requirements defined

