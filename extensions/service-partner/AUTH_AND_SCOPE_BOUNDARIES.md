# EXT-08 — Auth Boundaries & Scope Enforcement

Status: GOVERNANCE DRAFT
Extension: EXT-08 — Service Partner Experience & Workflow
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory authentication and authorisation
boundaries governing Service Partner access under EXT-08.

These boundaries are enforced by Core and consumed by this extension.

## Core Principles

- Default deny
- Explicit role assignment
- Least-privilege scope enforcement
- No implicit permissions
- No privilege escalation

## Identity Requirements

All Service Partner access requires:
- Authenticated identity
- Role explicitly set to ServicePartner
- Active account status
- Valid session context

Unauthenticated access is denied.

## Role Enforcement

Only identities with role:
- ServicePartner

are permitted to access EXT-08 functionality.

No other roles (Buyer, Supplier, Administrator, System)
may assume Service Partner capabilities.

## Scope Enforcement

Service Partner access is further restricted by scope.

Scopes may include (non-exhaustive):
- TASK_VIEW
- TASK_ACKNOWLEDGE
- EVIDENCE_SUBMIT

Scopes are:
- Explicitly assigned
- Task- and assignment-bound
- Non-transferable
- Time-bound where applicable

Absence of scope results in denial.

## Assignment Binding

All Service Partner actions MUST be:
- Bound to an active assignment
- Verified against assignment ownership
- Rejected if assignment is revoked or expired

No global Service Partner access is permitted.

## Prohibited Behaviour

Service Partners MUST NOT:
- Access tasks not assigned to them
- Perform actions outside granted scope
- Chain actions to infer authority
- Bypass Core enforcement layers

## Failure Handling

- Auth failures return explicit denial
- Scope failures return explicit denial
- No partial access
- No silent fallback

## Audit Requirements

All auth and scope checks MUST emit audit events:
- SERVICE_PARTNER_ACCESS_GRANTED
- SERVICE_PARTNER_ACCESS_DENIED

Audit events are mandatory and immutable.

## Out of Scope

- Token issuance
- Session lifecycle management
- Role provisioning workflows
- Scope assignment algorithms

These remain Core responsibilities.



Validation Checklist:

Default deny explicitly enforced

Role and scope clearly separated

Assignment binding mandatory

No implicit authority paths

Audit requirements defined

