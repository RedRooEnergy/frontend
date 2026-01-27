# EXT-29 — Data Ownership & Evidence Boundaries

Status: GOVERNANCE DRAFT  
Extension: EXT-29 — China Supplier Discovery, Prospecting & Outreach System  
Implementation: NOT AUTHORIZED

## Purpose

This document defines data ownership, evidence handling,
and boundary rules governing EXT-29.

EXT-29 must not become a system of record.

## Data Ownership Doctrine

EXT-29:
- Owns prospect-level data only
- Does not own supplier records
- Does not control retention beyond extension scope

Core remains authoritative post-onboarding.

## Extension-Owned Data

EXT-29 may own:
- Prospect company records
- Prospect contact details
- Source evidence metadata
- Engagement history
- Consent and suppression flags

## Evidence Handling Rules

EXT-29 may:
- Store source references
- Record discovery context

EXT-29 may NOT:
- Alter Core evidence
- Validate certifications
- Override compliance outcomes

## Failure Behaviour

If data ownership is unclear:
- Action MUST be denied
- Audit event MUST be recorded

## Audit Requirements

All data actions MUST be auditable.

## Out of Scope

- Encryption standards
- Backup systems
- Export tooling

Governed by Core.


Validation Checklist:

Data ownership defined  
Evidence limits enforced  
Extension-only ownership clear  
Audit requirements specified  

STOP POINT
