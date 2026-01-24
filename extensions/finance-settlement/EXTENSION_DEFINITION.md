# EXT-11 — Finance & Settlement Authority Experience

Status: GOVERNANCE DRAFT
Governance Phase: DEFINITION
Implementation: NOT AUTHORIZED

## Purpose
EXT-11 defines the Finance & Settlement Authority–facing experience within the
RedRooEnergy marketplace. It provides regulated visibility and control over
financial settlement, escrow release, reconciliation, and dispute resolution
under strict Core enforcement.

This extension is the only extension permitted to authorise settlement outcomes.

## In Scope
- Read-only visibility of payments, escrow states, and settlements
- Authorisation of escrow release and settlement finalisation
- Refund and adjustment authorisation (governed, explicit)
- Financial reconciliation views
- Dispute and exception resolution (financial only)
- Audit event emission for all finance actions

## Out of Scope
- Core modifications
- Pricing rule definition or calculation
- Buyer or Supplier UI
- Compliance decision-making
- Freight, logistics, or customs operations
- Payment provider integration logic (Core-owned)

## Governance Rules
- Finance decisions are authoritative and explicit
- All financial actions require dual control where mandated
- No implied or automatic settlement
- Decisions are auditable and immutable
- Default deny applies to all access

## Dependencies
- Immutable Core (Identity, Auth, Audit, Pricing Snapshot Integrity)
- Payments, escrow, and settlement records (Core-owned)
- Dispute and adjustment records (Core-owned)

## Change Control
Once authorised, all changes require a formal Change Control Request (CCR).



Validation Checklist:

Extension purpose is explicit and financial

Settlement authority clearly defined

Scope boundaries clear and non-overlapping

No implementation detail introduced

Governance-first positioning preserved

