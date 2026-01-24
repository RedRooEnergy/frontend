# EXT-15 — Return & Dispute Case Types, States & Ownership

Status: GOVERNANCE DRAFT
Extension: EXT-15 — Returns, Refunds & Dispute Management
Implementation: NOT AUTHORIZED

## Purpose

This document defines the authorised case types, lifecycle states,
and ownership rules governing all return, refund, and dispute cases
managed under EXT-15.

Cases provide structured, auditable handling of post-order issues.

## Core Principles

- All post-order issues are case-based
- Cases are created explicitly and never implied
- Case state transitions are controlled and auditable
- Ownership is procedural, not authoritative
- Default deny applies to all actions

## Case Types

EXT-15 supports the following case types:

### Return Case
Used when a buyer seeks to return goods under applicable return policies.

Typical triggers:
- Damaged goods
- Incorrect item
- Change-of-mind (where permitted)

### Refund Case
Used when a buyer seeks monetary reimbursement.

Typical triggers:
- Approved return
- Non-delivery
- Overcharge

### Dispute Case
Used when there is disagreement between parties requiring structured resolution.

Typical triggers:
- Product not as described
- Service failure
- Contractual disagreement

Each case type follows its own governed lifecycle.

## Case Ownership & Roles

- The platform is the custodian of all cases
- Buyers may initiate cases within policy constraints
- Suppliers participate but do not control outcomes
- Service Partners may provide evidence only
- Finance Authority decides financial outcomes
- Compliance Authority decides compliance outcomes
- Administrators oversee procedural integrity only

No single role owns a case end-to-end.

## Case Lifecycle States (Conceptual)

### Common States
- CREATED
- UNDER_REVIEW
- EVIDENCE_REQUESTED
- EVIDENCE_SUBMITTED
- PENDING_DECISION
- DECIDED
- CLOSED

### Return-Specific States
- RETURN_AUTHORISED
- ITEM_IN_TRANSIT
- ITEM_RECEIVED

### Refund-Specific States
- REFUND_REQUESTED
- REFUND_AUTHORISED
- REFUND_COMPLETED

### Dispute-Specific States
- DISPUTE_OPEN
- DISPUTE_ESCALATED
- DISPUTE_RESOLVED

State transitions are validated by Core and
may require external authority decisions.

## Ownership Boundaries

- Case creators do not control case outcome
- Evidence submitters do not control decisions
- Case state changes require explicit, auditable actions
- Historical case states are immutable

## Prohibited Behaviour

The system MUST NOT allow:
- Silent case creation or closure
- Skipping of required states
- Retroactive modification of case history
- Unauthorised state transitions

## Audit & Traceability

All case lifecycle events MUST emit audit events:
- CASE_CREATED
- CASE_STATE_CHANGED
- CASE_EVIDENCE_REQUESTED
- CASE_EVIDENCE_SUBMITTED
- CASE_CLOSED

Audit records are immutable.

## Out of Scope

- Case workflow automation
- SLA enforcement
- Negotiation logic
- External arbitration processes

These are addressed in later steps or Core.



Validation Checklist:

Case types clearly defined

Lifecycle states explicit

Ownership and authority boundaries enforced

Prohibited behaviours stated

Audit lifecycle events enumerated
