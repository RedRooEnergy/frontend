# EXT-10 — Governance & Authority Boundaries

Status: GOVERNANCE DRAFT
Extension: EXT-10 — Freight & Logistics Operator Experience
Implementation: NOT AUTHORIZED

## Role Definition

### Freight & Logistics Operator (FLO)

A Freight & Logistics Operator is an authorised operational actor
responsible for the physical movement, handling, and tracking of goods
within the RedRooEnergy marketplace supply chain.

This role is strictly operational and non-commercial.

The role is distinct from:
- Buyer
- Supplier
- Service Partner
- Compliance Authority
- Administrator

## Authority Scope

Freight & Logistics Operators MAY:
- View assigned shipments and consignments
- View shipment instructions and references
- Report shipment milestone status (signal only)
- View shipping documents and references
- Acknowledge handover or receipt events
- Emit audit events for logistics actions

Freight & Logistics Operators MAY NOT:
- Modify shipment definitions
- Alter commercial terms
- Approve or reject compliance
- Modify customs declarations
- Change pricing, duties, taxes, or GST
- Release, hold, or redirect payments
- Act on behalf of Buyers or Suppliers

## Authority Characteristics

- Authority is delegated, scoped, and task-bound
- No global logistics authority exists
- Actions represent signals, not decisions
- Core validates and enforces all state transitions

## Default-Deny Enforcement

- All access is denied unless explicitly authorised
- Role and scope are required for every action
- Absence of scope results in denial
- No implied permissions are permitted

## Separation of Duties

- Logistics operators do not perform compliance decisions
- Logistics operators do not submit compliance evidence
- Logistics operators do not handle settlement or escrow
- Logistics operators do not create or cancel shipments

## Audit & Accountability

Every logistics action MUST:
- Be attributable to an operator identity
- Be timestamped
- Emit an audit event
- Be traceable to a shipment or consignment

Audit records are immutable and regulator-visible.

## Change Control

Once EXT-10 enters implementation,
this document becomes immutable.
Any change requires a formal Change Control Request (CCR).



Validation Checklist:

Role definition explicit and operational

Authority boundaries clearly constrained

No compliance or financial authority leakage

Default-deny enforced

Audit and attribution mandatory

