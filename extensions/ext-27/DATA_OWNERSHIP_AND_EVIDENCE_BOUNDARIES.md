# EXT-27 — Data Ownership & Evidence Boundaries

Status: GOVERNANCE DRAFT  
Extension: EXT-27 — [EXTENSION NAME – TO BE CONFIRMED]  
Implementation: NOT AUTHORIZED

## Purpose

This document defines mandatory data ownership,
evidence handling, and data-boundary rules
governing EXT-27.

EXT-27 must not become a system of record.

## Data Ownership Doctrine

EXT-27:
- Does not own Core data
- Does not own authoritative records
- Does not control retention or deletion

All authoritative data ownership remains with Core
or designated external authorities.

## Extension-Owned Data

EXT-27 may own ONLY:
- Extension-scoped metadata
- Coordination markers
- Non-authoritative state references
- Derived or transient indicators

Extension-owned data must be segregated and identifiable.

## Evidence Handling Rules

EXT-27 may:
- Reference evidence
- Surface evidence metadata
- Link evidence to extension workflows

EXT-27 may NOT:
- Alter evidence
- Delete evidence
- Replace evidence
- Decide evidentiary validity

Evidence integrity is enforced by Core.

## Data Access Boundaries

EXT-27 may access data only when:
- Access is explicitly permitted
- Context is entity- or case-bound
- Purpose is documented

Bulk or exploratory access is prohibited.

## Write Constraints

EXT-27 writes are limited to:
- Extension-owned records
- Explicitly permitted references

EXT-27 MUST NOT:
- Write directly to Core tables
- Perform cascading updates
- Execute background mutations

## Data Leakage Prevention

EXT-27 MUST NOT:
- Expose sensitive Core data
- Aggregate cross-role information
- Provide indirect inference paths

Data minimisation is mandatory.

## Failure Behaviour

If data ownership is unclear:
- Action MUST be denied
- An audit event MUST be emitted
- No fallback is permitted

Fail-open behaviour is prohibited.

## Audit Requirements

The following MUST be auditable:
- Data access attempts
- Write operations
- Denied access events

Audit records are immutable.

## Out of Scope

- Physical storage mechanisms
- Encryption implementation
- Backup and recovery
- Data export tooling

These are governed by Core.


Validation Checklist:

Data ownership explicitly defined  
Extension-owned data constrained  
Evidence handling limits enforced  
Access and write boundaries defined  
Data leakage prevention stated  
Fail-closed behaviour enforced  
