# EXT-10 — Logistics Status Signalling Rules

Status: GOVERNANCE DRAFT
Extension: EXT-10 — Freight & Logistics Operator Experience
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory rules governing logistics
status signalling by Freight & Logistics Operators under EXT-10.

Status signals inform the Core platform of observed logistics events.
They do not constitute decisions or authoritative state changes.

## Core Principles

- Signals are non-authoritative
- Core validates and applies all state changes
- No signal guarantees acceptance
- Absence of signal does not imply failure
- All signals are auditable and attributable

## Signal Definition

A status signal represents an operational observation
reported by a Freight & Logistics Operator.

Examples (non-exhaustive):
- Shipment handed over to carrier
- Consignment loaded or unloaded
- Arrival at port or facility
- Delay encountered
- Damage or loss observed
- Delivery attempted or completed

Signals do not assert compliance, clearance, or completion.

## Permitted Signals

Freight & Logistics Operators MAY signal:

- Shipment milestone reached
- Consignment handling events
- Exception conditions (delay, damage, loss)
- Handover or receipt acknowledgements

Signals MUST reference:
- Shipment ID
- Consignment ID (if applicable)
- Signal type
- Timestamp
- Operator identity

## Prohibited Signals

Freight & Logistics Operators MUST NOT signal:

- Customs clearance
- Compliance approval
- Financial settlement milestones
- Final delivery acceptance on behalf of buyers
- Any signal outside assigned shipments or consignments

## Validation & Application

- All signals are validated by Core
- Core determines whether a signal results in a state change
- Invalid or conflicting signals are rejected
- Rejected signals are audited

## Failure Handling

- Signal submission failures fail closed
- Partial or ambiguous signals are rejected
- Errors must be explicit and logged
- No silent acceptance

## Audit & Traceability

Every signal MUST emit an audit event including:
- Signal type
- Shipment / consignment reference
- Operator identity
- Timestamp
- Outcome (ACCEPTED / REJECTED)

Audit records are immutable and regulator-visible.

## Out of Scope

- Signal transport mechanisms
- Retry logic or buffering
- Carrier system integrations
- Automated tracking ingestion

These remain Core responsibilities.



Validation Checklist:

Non-authoritative nature explicit

Signal vs decision clearly separated

Core validation enforced

Audit and attribution mandatory

No implementation detail introduced

