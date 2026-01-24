# EXT-27 — Authority, Delegation & Trust Model

Status: GOVERNANCE DRAFT  
Extension: EXT-27 — [EXTENSION NAME – TO BE CONFIRMED]  
Implementation: NOT AUTHORIZED

## Purpose

This document defines authority sources,
delegation boundaries, and trust assumptions
governing EXT-27.

EXT-27 must never originate, infer, or expand authority.

## Authority Source Doctrine

All authority exercised by EXT-27 originates from:
- Core identity and role enforcement
- Explicit delegation mechanisms approved by Core
- Recognised external authorities designated by Core

EXT-27 is not an authority source.

## Delegation Constraints

EXT-27 may act ONLY when:
- Authority is explicitly delegated
- Delegation scope is clearly defined
- Delegation is context-bound and time-bound

Implicit or inherited delegation is prohibited.

## No Authority Elevation Rule

EXT-27 MUST NOT:
- Elevate privileges through workflow sequencing
- Combine partial authorities into broader access
- Reinterpret delegation scope
- Persist delegated authority beyond its validity

Authority elevation is prohibited.

## Trust Boundaries

EXT-27 trust boundaries are defined by:
- Core validation of identity and role
- Verified delegation records
- Explicit external authority recognition

Unverified trust is not permitted.

## External Authority Interaction

EXT-27 MAY:
- Reference determinations from recognised authorities
- Surface externally validated outcomes

EXT-27 MUST NOT:
- Validate authority authenticity
- Substitute for authority verification
- Resolve authority conflicts

Authority verification is enforced by Core.

## Failure on Authority Uncertainty

If authority cannot be conclusively verified:
- Action MUST be denied
- Escalation MUST occur
- No degraded or provisional mode is allowed

Fail-open behaviour is prohibited.

## Audit Requirements

The following MUST be auditable:
- Authority verification attempts
- Delegation checks
- Denied actions due to authority failure
- Escalation events

Audit records are immutable.

## Out of Scope

- Role definitions
- Permission schema design
- Identity verification mechanisms
- Delegation lifecycle management

These are governed by Core.


Validation Checklist:

Authority sources constrained  
Delegation boundaries defined  
Authority elevation prohibited  
Trust boundaries stated  
Fail-closed behaviour enforced  
Audit requirements specified  
