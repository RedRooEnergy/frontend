# EXT-10 — Freight & Logistics Operator Experience

Status: GOVERNANCE DRAFT
Governance Phase: DEFINITION
Implementation: NOT AUTHORIZED

## Purpose
EXT-10 defines the Freight & Logistics Operator–facing experience within the
RedRooEnergy marketplace. It supports shipment visibility, logistics task
coordination, and status reporting under strict Core control.

This extension enables operational logistics interaction without granting
commercial, compliance, or financial authority.

## In Scope
- Read-only visibility of assigned shipments and consignments
- Shipment milestone status reporting (signal only)
- Document visibility (shipping documents, references)
- Audit event emission for all logistics actions
- Role-scoped UI and routes for logistics operators

## Out of Scope
- Core modifications
- Pricing, duties, taxes, GST, or settlement
- Compliance approval or rejection
- Buyer or Supplier impersonation
- Evidence storage or document mutation
- Customs decision authority

## Governance Rules
- Core remains the sole source of truth
- Logistics operators act under delegated, scoped authority only
- All actions are auditable and attributable
- Default deny applies to all access
- No implied authority or automation

## Dependencies
- Immutable Core (Identity, Auth, Audit)
- Shipment, consignment, and tracking entities (Core-owned)
- Document references (Core-owned)

## Change Control
Once authorised, all changes require a formal Change Control Request (CCR).



Validation Checklist:

Extension purpose is explicit and operational

Scope boundaries clearly defined

No compliance or financial authority implied

No implementation detail introduced

Governance-first positioning preserved

