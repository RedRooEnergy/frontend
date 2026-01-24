# EXT-21 — Functional Scope & Capability Boundaries

Status: GOVERNANCE DRAFT  
Extension: EXT-21 — [EXTENSION NAME – TO BE CONFIRMED]  
Implementation: NOT AUTHORIZED

## Purpose

This document defines the exact functional scope EXT-21 is permitted to
operate within and explicitly constrains what EXT-21 is not allowed to do.

EXT-21 capabilities must remain narrow, explicit, and non-authoritative.

## Functional Scope

EXT-21 is permitted to perform ONLY the following classes of functions:

- Extension-specific coordination logic
- Extension-scoped data aggregation or presentation
- Workflow assistance without authority
- Read-only or explicitly permitted write actions within scope

All permitted functions must be explicitly enumerated in later
governance steps.

## Capability Boundaries

EXT-21 MUST NOT perform:

- Core business rule enforcement
- Decision-making authority
- Financial execution
- Compliance approval or rejection
- Identity, role, or permission management
- Cross-extension orchestration

These capabilities are reserved to Core or external authorities.

## Data Interaction Limits

EXT-21 may interact only with:
- Extension-owned records
- Explicitly referenced Core entities
- Read-only Core data via approved interfaces

EXT-21 MUST NOT:
- Modify Core-owned data
- Perform bulk data access
- Execute cross-entity mutations

## Workflow Boundaries

EXT-21 may:
- Assist workflows
- Track progress
- Surface state or indicators

EXT-21 may NOT:
- Advance irreversible state
- Force transitions
- Auto-resolve outcomes

Authority remains external.

## Enforcement Doctrine

Functional boundaries are enforced by:
- Default deny
- Explicit allow
- Context-bound scope
- Auditable denial

Absence of permission is denial.

## Failure Behaviour

If EXT-21 encounters:
- Out-of-scope requests
- Boundary violations
- Ambiguous authority

The action MUST be denied and audited.

Fail-open behaviour is prohibited.

## Boundary Drift Prevention

EXT-21 functionality must not expand through:
- Configuration changes
- Feature flags
- Environment variables
- Silent releases

Any scope change requires formal change control.

## Out of Scope

- Detailed use cases
- Implementation sequencing
- UI elements
- Performance characteristics

These are addressed only after authorisation.

---

Validation Checklist:

Functional scope explicitly defined

Capability limits clearly stated

Data interaction boundaries enforced

Workflow authority separation preserved

Fail-closed behaviour specified

Boundary drift prohibited

STOP POINT

Reply only with:

EXT-21 STEP 02 COMPLETE

Next step will be:  
EXT-21 STEP 03 — Authority Separation & Decision Boundaries
