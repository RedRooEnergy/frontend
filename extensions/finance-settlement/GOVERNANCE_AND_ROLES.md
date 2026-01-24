# EXT-11 — Governance & Settlement Decision Model

Status: GOVERNANCE DRAFT
Extension: EXT-11 — Finance & Settlement Authority Experience
Implementation: NOT AUTHORIZED

## Role Definition

### Finance & Settlement Authority (FSA)

A Finance & Settlement Authority is a formally authorised actor empowered
to make binding financial settlement decisions within the RedRooEnergy platform.

This role governs escrow release, settlement finalisation, refunds,
adjustments, and dispute resolution under defined financial controls.

This role is distinct from:
- Buyer
- Supplier
- Service Partner
- Freight & Logistics Operator
- Compliance Authority
- Administrator

## Authority Levels

Finance authority may be stratified by level, as defined by Core governance.

Conceptual examples:
- FSA_L1 — Review & Recommendation
- FSA_L2 — Escrow Release & Refund Approval
- FSA_L3 — Settlement Finalisation & Dispute Resolution

Authority levels define *which financial actions may be authorised*,
not how payments are executed.

## Decision Powers

Finance & Settlement Authorities MAY:
- Review payment and escrow states
- Authorise escrow release
- Finalise settlement
- Approve refunds and adjustments
- Resolve financial disputes
- Issue financial exception decisions

Finance & Settlement Authorities MAY NOT:
- Modify pricing rules or snapshots
- Bypass escrow or pricing integrity checks
- Override audit logging
- Alter historical financial records
- Act outside delegated authority level

## Decision Characteristics

All financial decisions:
- Are explicit and intentional
- Require rationale or reason codes
- Are attributable to an authority identity
- Are timestamped
- Are immutable once issued

Financial decisions are authoritative system actions.

## Separation of Duties

- Finance Authorities do not set pricing rules
- Finance Authorities do not approve compliance
- Finance Authorities do not operate freight or logistics
- Finance Authorities do not act as Buyers or Suppliers

## Audit & Accountability

Every financial decision MUST emit:
- Decision type
- Decision outcome
- Rationale or reason code
- Authority identity
- Authority level
- Timestamp
- Affected transaction or escrow reference

Audit records are immutable and regulator-visible.

## Change Control

Once EXT-11 enters implementation,
this governance document becomes immutable.
Any change requires formal Change Control (CCR).



Validation Checklist:

Finance authority role explicit

Authority levels clearly bounded

Settlement and escrow powers defined

Separation of duties enforced

Audit and immutability explicit

