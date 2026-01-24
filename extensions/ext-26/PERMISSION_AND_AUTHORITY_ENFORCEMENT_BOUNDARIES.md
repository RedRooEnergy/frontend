# EXT-26 — Permission & Authority Enforcement Boundaries

Status: GOVERNANCE DRAFT  
Extension: EXT-26 — [EXTENSION NAME – TO BE CONFIRMED]  
Implementation: NOT AUTHORIZED

## Purpose

This document defines mandatory permission checks,
authority validation boundaries, and non-bypassable
enforcement rules governing EXT-26.

EXT-26 must never infer, assume, or expand authority.

## Authority Source Doctrine

All authority decisions originate from:
- Core identity and role enforcement
- Explicit delegation mechanisms approved by Core
- Recognised external authorities designated by Core

EXT-26 is not an authority source.

## Permission Preconditions

EXT-26 actions require:
- Verified identity context
- Explicit permission grant
- Entity- or case-scoped authority
- Purpose alignment with documented mandate

Absence of any precondition results in denial.

## No Implicit Authority Rule

EXT-26 MUST NOT:
- Infer permission from role names
- Assume authority based on prior actions
- Reuse cached permission outcomes
- Elevate privileges through workflow sequencing

All permissions are evaluated per action.

## Enforcement Boundaries

EXT-26 enforcement is limited to:
- Verifying permission presence
- Denying unauthorised actions
- Emitting audit events

EXT-26 MUST NOT:
- Modify permission sets
- Grant temporary access
- Defer enforcement decisions

## Non-Bypassability

Permission checks MUST be:
- Mandatory
- Central to execution
- Non-configurable
- Non-overridable

No execution path may bypass enforcement.

## Cross-Role Isolation

EXT-26 MUST NOT:
- Bridge permissions across roles
- Expose cross-role capabilities
- Allow indirect authority inference

Role isolation is mandatory.

## Failure on Uncertainty

If authority cannot be conclusively verified:
- Action MUST be denied
- Escalation MUST be raised
- No degraded mode is allowed

Fail-open behaviour is prohibited.

## Audit Requirements

The following MUST be auditable:
- Permission checks
- Denials
- Escalation events

Audit records are immutable.

## Out of Scope

- Role definition
- Permission schema design
- Identity verification mechanisms
- Delegation lifecycle management

These are governed by Core.


Validation Checklist:

Authority sources constrained  
Permission preconditions defined  
Implicit authority prohibited  
Enforcement boundaries enforced  
Non-bypassability stated  
Fail-closed on uncertainty required  
