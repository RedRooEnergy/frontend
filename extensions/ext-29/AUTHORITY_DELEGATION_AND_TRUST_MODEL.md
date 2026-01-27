# EXT-29 — Authority, Delegation & Trust Model

Status: GOVERNANCE DRAFT  
Extension: EXT-29 — China Supplier Discovery, Prospecting & Outreach System  
Implementation: NOT AUTHORIZED

## Purpose

This document defines authority sources, delegation constraints,
and trust boundaries governing EXT-29.

EXT-29 must never originate, infer, or expand authority.

## Authority Source Doctrine

All authority exercised by EXT-29 originates from:
- Core identity and role enforcement
- Explicit delegation approved by Core
- Recognised external authorities designated by Core

EXT-29 is not an authority source.

## Delegation Constraints

EXT-29 may act ONLY when:
- Authority is explicitly delegated
- Delegation scope is documented
- Delegation is context- and time-bound

Implicit delegation is prohibited.

## Trust Boundaries

Trust is limited to:
- Verified system identities
- Approved operator roles
- Documented data sources

Unverified trust is not permitted.

## Fail-Closed Behaviour

If authority is unclear:
- Action MUST be denied
- Outreach MUST not proceed
- Escalation MUST occur

Fail-open behaviour is prohibited.

## Audit Requirements

The following MUST be auditable:
- Authority checks
- Delegation usage
- Denied actions
- Escalations

Audit records are immutable.

## Out of Scope

- Role definition
- Permission schemas
- Identity verification mechanisms

These are governed by Core.


Validation Checklist:

Authority sources constrained  
Delegation limits defined  
Trust boundaries enforced  
Fail-closed behaviour stated  
Audit requirements specified  

STOP POINT
