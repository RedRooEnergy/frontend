# EXT-25 — Authority Separation & Decision Boundaries

Status: GOVERNANCE DRAFT  
Extension: EXT-25 — [EXTENSION NAME – TO BE CONFIRMED]  
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory separation between coordination,
information handling, and authoritative decision-making for EXT-25.

EXT-25 must never become a decision authority.

## Authority Model

EXT-25 operates strictly as:
- A coordinator
- An information surface
- A workflow assistant

EXT-25 is NOT an authority.

## Decision Ownership

All authoritative decisions remain with:
- Core platform rules
- Designated Core authorities
- External authorities as defined by governance

EXT-25 may observe and record decisions but must not influence outcomes.

## Prohibited Authority Actions

EXT-25 MUST NOT:
- Approve or reject actions
- Trigger irreversible state changes
- Execute financial actions
- Resolve compliance or regulatory outcomes
- Override Core enforcement

Any such behaviour constitutes a governance breach.

## Coordination vs Authority Boundary

EXT-25 may:
- Track decision status
- Record timestamps
- Surface outcomes
- Route information

EXT-25 may NOT:
- Decide
- Enforce
- Execute
- Bypass

## Decision Input Handling

EXT-25 may accept inputs ONLY as:
- Non-binding information
- Evidence references
- Coordination signals

Inputs must not be treated as authority.

## Ambiguity Handling

If decision authority is ambiguous:
- EXT-25 MUST deny the action
- EXT-25 MUST emit an audit event
- No fallback is permitted

Default deny applies.

## Audit Requirements

The following MUST be auditable:
- All denied authority attempts
- All recorded external decisions
- Any attempted authority escalation

Audit records are immutable.

## Out of Scope

- Decision algorithms
- Approval workflows
- Enforcement mechanisms
- Authority delegation models

These are governed by Core.

---

Validation Checklist:

Authority separation explicitly defined  
Decision ownership clearly stated  
Prohibited actions enumerated  
Coordination vs authority boundary enforced  
Ambiguity handling defined  
Audit obligations specified  

STOP POINT

Reply only with:

**EXT-25 STEP 03 COMPLETE**

Next step will be:  
**EXT-25 STEP 04 — Data Ownership & Evidence Boundaries**
