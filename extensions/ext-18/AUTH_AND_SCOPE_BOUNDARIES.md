# EXT-18 — Auth Boundaries & Scope Enforcement

Status: GOVERNANCE DRAFT  
Extension: EXT-18 — [EXTENSION NAME – TO BE CONFIRMED]  
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory authentication and authorisation
boundaries governing all access to EXT-18 functionality.

EXT-18 enforces access strictly through Core identity and scope controls.

## Core Principles

- Default deny
- Explicit role and scope enforcement
- Context-bound access
- Separation of coordination vs authority
- No implicit permissions

## Identity Requirements

All access to EXT-18 requires:
- Authenticated identity
- Role recognised by Core
- Active account status
- Valid session context

Unauthenticated access is denied.

## Role-Based Access (Conceptual)

Access is granted only where:
- The actor has a recognised Core role
- The required scope is present
- The action is contextually valid

### Buyer
Scopes:
- EXT18_VIEW_BUYER

Access:
- View extension-relevant information for own entities only

### Supplier
Scopes:
- EXT18_VIEW_SUPPLIER

Access:
- View extension-relevant information for own products or orders

### Service Partner
Scopes:
- EXT18_VIEW_ASSIGNED

Access:
- View extension data for assigned entities only

### Administrator
Scopes:
- EXT18_VIEW_ALL
- EXT18_OVERSIGHT

Access:
- Platform-wide read-only oversight
- No authority decisions or mutations

## Scope Enforcement Rules

- Scopes are explicit and non-transferable
- Absence of scope results in denial
- View scopes do not imply write scopes
- No scope inheritance is permitted

## Context Binding

All actions MUST be:
- Bound to a specific entity or case ID
- Verified against actor participation
- Rejected if context linkage does not exist

No global browsing is permitted.

## Prohibited Behaviour

EXT-18 MUST NOT allow:
- Access outside assigned scope
- Cross-role impersonation
- Scope escalation
- Authority execution

## Failure Handling

- Auth failures return explicit denial
- Scope failures return explicit denial
- Context failures return explicit denial
- No silent fallback

## Audit Requirements

All auth and scope checks MUST emit audit events:
- EXT18_ACCESS_GRANTED
- EXT18_ACCESS_DENIED
- EXT18_SCOPE_MISMATCH

Audit records are immutable.

## Out of Scope

- Role provisioning
- Scope assignment logic
- Permission engine implementation
- Session lifecycle management

These are enforced by Core.

---

Validation Checklist:

Default deny enforced

Role and scope separation explicit

Context binding mandatory

Prohibited behaviours defined

Audit requirements enumerated
