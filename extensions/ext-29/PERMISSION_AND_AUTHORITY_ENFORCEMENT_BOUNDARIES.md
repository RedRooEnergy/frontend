# EXT-29 — Permission & Authority Enforcement Boundaries

Status: GOVERNANCE DRAFT  
Extension: EXT-29 — China Supplier Discovery, Prospecting & Outreach System  
Implementation: NOT AUTHORIZED

## Purpose

Defines non-bypassable permission enforcement
for EXT-29.

## Enforcement Rules

EXT-29 MUST:
- Verify permission per action
- Deny unauthorised actions
- Emit audit events

## Prohibitions

EXT-29 MUST NOT:
- Grant permissions
- Cache authority
- Bridge roles

## Fail-Closed Rule

Uncertainty results in denial.

## Audit Requirements

All permission checks MUST be audited.


Validation Checklist:

Permission enforcement defined  
Bypass prohibited  
Fail-closed enforced  
Audit specified  

STOP POINT
