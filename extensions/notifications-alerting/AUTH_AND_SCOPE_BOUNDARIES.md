# EXT-13 — Auth Boundaries & Scope Enforcement

Status: GOVERNANCE DRAFT
Extension: EXT-13 — Platform Notifications, Alerting & Communications
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory authentication and authorisation
boundaries governing notification access and visibility under EXT-13.

Notifications are informational artefacts and must be strictly scoped.

## Core Principles

- Default deny
- Explicit role assignment
- Least-privilege scope enforcement
- Read-only access to delivered notifications
- No implicit permissions

## Identity Requirements

All notification access requires:
- Authenticated identity
- Role explicitly recognised by Core
- Active account status
- Valid session context

Unauthenticated access is denied.

## Role Enforcement

The following roles may access notifications addressed to them:

- Buyer
- Supplier
- Service Partner
- Freight & Logistics Operator
- Compliance Authority
- Finance & Settlement Authority
- Administrator
- Executive

Roles may only access notifications explicitly addressed to their identity.

## Scope Enforcement

Notification access is further restricted by explicit scopes.

Scopes may include (non-exhaustive):
- NOTIFICATION_VIEW
- NOTIFICATION_ACKNOWLEDGE
- NOTIFICATION_PREFERENCE_MANAGE
- NOTIFICATION_ADMIN_VIEW (Administrator only)

Scopes are:
- Explicitly assigned
- Non-transferable
- Identity-bound

Absence of required scope results in denial.

## Administrative Boundaries

Administrators MAY:
- View system-level notification metrics
- Access notification delivery status (aggregated)
- Manage notification templates (subject to governance)

Administrators MAY NOT:
- View individual user notification content without justification
- Send ad-hoc or free-form notifications
- Override consent without legal basis

## Prohibited Behaviour

Users MUST NOT:
- Access notifications not addressed to them
- Modify notification content
- Re-dispatch notifications
- Bypass consent or preference controls

## Failure Handling

- Auth failures return explicit denial
- Scope failures return explicit denial
- Access attempts fail closed
- No silent fallback

## Audit Requirements

All auth and scope checks MUST emit audit events:
- NOTIFICATION_ACCESS_GRANTED
- NOTIFICATION_ACCESS_DENIED
- NOTIFICATION_SCOPE_MISMATCH

Audit records are immutable.

## Out of Scope

- Role provisioning workflows
- Scope assignment logic
- Session lifecycle management
- Credential issuance

These remain Core responsibilities.



Validation Checklist:

Default deny explicitly enforced

Role-based access bounded to recipient

Scope enforcement clearly defined

Administrative access tightly constrained

Audit requirements defined
