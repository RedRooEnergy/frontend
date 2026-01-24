# EXT-16 — Audit Coverage & Evidence Mapping

Status: GOVERNANCE DRAFT  
Extension: EXT-16 — [EXTENSION NAME – TO BE CONFIRMED]  
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory audit events, evidence artefacts,
and traceability rules governing all EXT-16 activities.

EXT-16 must be fully auditable and reconstructable without reliance on
implicit state or undocumented behaviour.

## Audit Doctrine Alignment

EXT-16 audit requirements align strictly with Core audit doctrine.

- All audit records are immutable
- All audit events are timestamped
- All audit events are actor-attributed
- No audit suppression is permitted

Audit emission occurs only via Core-approved interfaces.

## Audit Coverage Scope

Audit coverage applies to ALL EXT-16 actions, including:

- Access attempts
- Data reads
- Data writes (where permitted)
- Coordination actions
- State reference changes
- Integration handoffs
- Failure and denial events

No silent operations are permitted.

## Mandatory Audit Events

At minimum, EXT-16 MUST emit:

- EXT16_ACCESS_GRANTED
- EXT16_ACCESS_DENIED
- EXT16_SCOPE_MISMATCH
- EXT16_DATA_READ
- EXT16_DATA_WRITE
- EXT16_ACTION_REJECTED
- EXT16_ACTION_FAILED

Event naming is declarative and mandatory.

## Audit Event Attributes

Each audit event MUST include:

- Event type
- Actor ID
- Actor role
- Target entity or case ID
- Timestamp (UTC)
- Action outcome
- Correlation ID

Absence of any attribute constitutes non-compliance.

## Evidence Artefacts

EXT-16 evidence includes:
- Extension-owned metadata records
- Coordination markers
- Derived state references
- Audit logs

EXT-16 does not own authoritative evidence.

## Evidence Integrity

- Evidence is append-only
- Historical records are immutable
- No overwrites or deletions are permitted
- Integrity is enforced by Core

## Traceability Requirements

It MUST be possible to reconstruct:
- All EXT-16 interactions
- Actor access paths
- Denied or failed actions
- Integration failures

Reconstruction must not require inference.

## Failure Handling

If audit emission fails:
- The triggering action MUST fail
- No partial execution is permitted
- Failure itself MUST be auditable

Fail-open audit behaviour is prohibited.

## Prohibited Behaviour

EXT-16 MUST NOT:
- Batch audit events
- Delay audit emission
- Modify audit records
- Mask actor identity
- Collapse multiple actions into one event

## Out of Scope

- Audit storage implementation
- Log aggregation tooling
- Export formats
- UI presentation of audit data

These are governed by Core.

---

Validation Checklist:

All EXT-16 actions mapped to audit events

Mandatory events enumerated

Audit attributes explicitly defined

Evidence integrity rules stated

Fail-closed audit behaviour enforced

Traceability requirements defined
