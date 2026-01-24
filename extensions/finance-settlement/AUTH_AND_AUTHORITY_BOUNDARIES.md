# EXT-11 — Auth Boundaries & Authority Level Enforcement

Status: GOVERNANCE DRAFT
Extension: EXT-11 — Finance & Settlement Authority Experience
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory authentication, authorisation,
and authority-level enforcement rules governing Finance & Settlement Authorities.

These controls are enforced by Core and consumed by EXT-11.

## Core Principles

- Default deny
- Explicit role assignment
- Explicit authority level enforcement
- Least-privilege financial authority
- No implicit or inferred permissions

## Identity Requirements

All Finance & Settlement Authority access requires:
- Authenticated identity
- Role explicitly set to FinanceAuthority
- Active authority status
- Valid session context

Unauthenticated access is denied.

## Authority Level Enforcement

Finance & Settlement Authorities operate under a declared authority level.

Authority levels define which financial actions may be authorised:

Conceptual examples:
- FSA_L1: Review, recommendation, evidence inspection
- FSA_L2: Escrow release and refund authorisation
- FSA_L3: Settlement finalisation and dispute resolution

Authority level:
- Is explicitly assigned by Core
- Is non-transferable
- Cannot be escalated dynamically
- Is validated on every financial decision action

Absence or mismatch of authority level results in denial.

## Case & Transaction Binding

All Finance Authority actions MUST be:
- Bound to a specific financial case
- Linked to a transaction or escrow record
- Validated against case and escrow state
- Rejected if the case is closed or immutable

No global or unscoped financial actions are permitted.

## Prohibited Behaviour

Finance Authorities MUST NOT:
- Act outside assigned authority level
- Bypass pricing snapshot integrity checks
- Authorise settlement without escrow protection
- Modify or delete prior financial decisions
- Override audit emission

## Failure Handling

- Auth failures return explicit denial
- Authority-level failures return explicit denial
- Decision attempts fail closed
- No silent fallback or partial success

## Audit Requirements

All auth and authority checks MUST emit audit events:
- FINANCE_AUTHORITY_ACCESS_GRANTED
- FINANCE_AUTHORITY_ACCESS_DENIED
- FINANCE_AUTHORITY_AUTHORITY_MISMATCH

Audit records are immutable and mandatory.

## Out of Scope

- Authority provisioning workflows
- Role assignment processes
- Authority escalation handling
- Credential lifecycle management

These remain Core responsibilities.



Validation Checklist:

Default deny enforced

Authority levels explicitly bounded

Case and escrow binding mandatory

No implicit financial authority paths

Audit requirements defined

