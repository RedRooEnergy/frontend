# EXT-10 — Freight & Logistics UI Scope

Status: GOVERNANCE DRAFT
Extension: EXT-10 — Freight & Logistics Operator Experience
Implementation: NOT AUTHORIZED

## Purpose

This document defines the authorised user-interface scope
for Freight & Logistics Operators operating under EXT-10.

The UI supports operational visibility and milestone signalling
without granting authority over commercial, compliance, or financial state.

## Core UI Principles

- Operational visibility first
- Read-only by default
- Explicit, scoped signals only
- No implied decisions or automation
- Every action emits an audit event

## Permitted Views (Read-Only)

Freight & Logistics Operators MAY view:

- Assigned shipments list
- Individual shipment overview
- Associated consignments
- Shipment and consignment states
- High-level origin and destination
- Tracking and carrier references
- Referenced shipping documents (view-only)
- Related order reference identifiers

Views do not expose:
- Pricing, margins, or commercial terms
- Duties, taxes, or GST calculations
- Compliance decision logic
- Buyer personal data beyond operational necessity
- Supplier internal commercial data

## Permitted Actions (Signal-Only)

Freight & Logistics Operators MAY perform:

- Acknowledge shipment handover
- Signal shipment milestone reached
- Signal consignment handling events
- Report exceptions (delay, damage, loss)
- Acknowledge receipt or delivery

These actions:
- Represent signals only
- Do not directly change Core state
- Are validated and applied by Core
- Do not imply approval or completion

## Prohibited Actions

Freight & Logistics Operators MAY NOT:

- Create, cancel, or modify shipments
- Modify consignment definitions
- Approve customs or compliance outcomes
- Edit or delete documents
- Trigger settlement or payment release
- Act on behalf of Buyers or Suppliers

## UI Constraints

- No bulk status updates
- No background automation
- No optimistic UI updates
- Clear indication of signal vs decision
- UI must reflect Core-confirmed state only

## Audit Requirements

Every UI action must:
- Be attributable to an operator identity
- Be timestamped
- Emit an audit event
- Be traceable to a shipment or consignment

## Accessibility & Integrity

- Clear role identification
- Explicit shipment ownership context
- Fail-closed error handling
- Regulator-ready traceability



Validation Checklist:

UI scope explicitly bounded

Signal-only actions clearly distinguished

No commercial or compliance authority leakage

Audit requirements explicit

Core authority preserved

