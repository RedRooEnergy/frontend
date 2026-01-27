# EXT-29 — Failure Handling & Escalation Doctrine

Status: GOVERNANCE DRAFT  
Extension: EXT-29 — China Supplier Discovery, Prospecting & Outreach System  
Implementation: NOT AUTHORIZED

## Purpose

This document defines fail-closed behaviour and escalation
rules governing EXT-29.

## Failure Classes

- Authority failures
- Consent uncertainty
- Data boundary violations
- Outreach governance breaches
- Dependency ambiguity

## Fail-Closed Doctrine

On any failure:
- Action MUST stop
- No partial state allowed
- No retries permitted

## Escalation Triggers

Escalation is mandatory when:
- Consent status is unclear
- Authority cannot be verified
- Data boundaries are crossed

## Escalation Targets

- Core governance handlers
- Authorised administrators

## Audit Requirements

All failures and escalations MUST be audited.

## Out of Scope

- Incident remediation
- Automated recovery

Governed by Core.


Validation Checklist:

Failure classes defined  
Fail-closed enforced  
Escalation rules defined  
Audit enforced  

STOP POINT
