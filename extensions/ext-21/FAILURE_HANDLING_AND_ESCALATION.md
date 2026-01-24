# EXT-21 — Failure Handling & Escalation Doctrine

Status: GOVERNANCE DRAFT  
Extension: EXT-21 — [EXTENSION NAME – TO BE CONFIRMED]  
Implementation: NOT AUTHORIZED

## Purpose

This document defines how EXT-21 must behave under failure conditions,
ambiguity, or degraded operation.

EXT-21 must fail closed, escalate correctly, and never compromise Core
stability or authority.

## Failure Classification

Failures within EXT-21 are classified as:
- Input validation failures
- Authorisation or scope failures
- Data boundary violations
- Integration failures
- Internal processing errors

All failure types are treated as non-recoverable at extension level.

## Failure Behaviour

On any failure:
- The triggering action MUST fail
- No partial state mutation is permitted
- No retries occur without revalidation
- The failure is auditable

Fail-open behaviour is prohibited.

## Escalation Doctrine

EXT-21 may escalate failures ONLY by:
- Emitting audit events
- Recording failure state
- Signalling Core escalation pathways

EXT-21 MUST NOT:
- Self-resolve failures
- Auto-correct state
- Retry silently
- Suppress escalation

## Authority Ambiguity Handling

If authority or responsibility is unclear:
- EXT-21 MUST deny the action
- EXT-21 MUST emit an audit event
- EXT-21 MUST surface the ambiguity

Default deny applies.

## Degraded Operation

If EXT-21 enters degraded state:
- No new extension actions may begin
- Existing records remain readable
- Core operation remains unaffected

Graceful degradation is mandatory.

## Failure Containment

EXT-21 failures MUST:
- Be contained within the extension
- Not cascade into Core
- Not impact other extensions

Isolation is mandatory.

## Audit Requirements

The following MUST be auditable:
- All failure events
- All escalations
- All denied actions

Audit records are immutable.

## Out of Scope

- Retry strategies
- Circuit breakers
- Monitoring tools
- Alert thresholds

These are governed elsewhere.

---

Validation Checklist:

Failure types defined

Fail-closed behaviour enforced

Escalation rules explicitly stated

Authority ambiguity handling defined

Containment guarantees stated

Audit requirements specified

STOP POINT

Reply only with:

EXT-21 STEP 05 COMPLETE

Next step will be:  
EXT-21 STEP 06 — Core Integration Boundaries
