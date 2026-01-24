# EXT-15 — Returns, Refunds & Dispute Management

Status: GOVERNANCE DRAFT
Governance Phase: DEFINITION
Implementation: NOT AUTHORIZED

## Purpose
EXT-15 defines the governed returns, refunds, and dispute management
capabilities for the RedRooEnergy marketplace. It provides structured
workflows for post-order issues while preserving strict separation
between operational handling, financial authority, and compliance decisions.

This extension coordinates processes; it does not execute payments
or override compliance or finance authority.

## In Scope
- Return request initiation and tracking
- Refund request initiation and tracking
- Dispute case creation and lifecycle management
- Evidence submission for disputes (append-only)
- Status visibility for buyers, suppliers, and authorities
- Role-scoped communications and notifications
- Audit event emission for all actions

## Out of Scope
- Core modifications
- Payment execution or escrow release (EXT-11)
- Compliance decision-making (EXT-09)
- Logistics execution (EXT-10)
- Pricing rule changes
- Ad-hoc negotiation or free-form resolution

## Governance Rules
- Returns and disputes are case-based and auditable
- Financial outcomes require Finance Authority approval
- Compliance outcomes require Compliance Authority approval
- Evidence is append-only and immutable
- Default deny applies to all access and actions

## Dependencies
- Immutable Core (Identity, Auth, Audit)
- Orders, payments, escrow, and settlement records (Core-owned)
- Compliance cases and decisions (EXT-09)
- Finance & Settlement Authority (EXT-11)
- Documents & Evidence Portal (EXT-14)
- Notifications & Communications (EXT-13)

## Change Control
Once authorised, all changes require a formal Change Control Request (CCR).



Validation Checklist:

Extension purpose clearly post-order and procedural

Financial and compliance authority explicitly excluded

Case-based governance enforced

Dependencies explicitly listed

Governance-first positioning preserved
