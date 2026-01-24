# EXT-14 — Documents, Evidence & Records Portal

Status: GOVERNANCE DRAFT
Governance Phase: DEFINITION
Implementation: NOT AUTHORIZED

## Purpose
EXT-14 defines the governed documents, evidence, and records portal for the
RedRooEnergy marketplace. It provides controlled visibility, upload, linkage,
and retention of documents and evidence across orders, compliance cases,
logistics, finance, disputes, and governance processes.

This extension is a records portal, not a decision system.

## In Scope
- Read-only and append-only document access (role-scoped)
- Evidence upload and association (append-only)
- Document metadata and version visibility
- Cross-entity document linkage (orders, cases, shipments, finance)
- Records retention and immutability enforcement
- Evidence pack generation (read-only exports)
- Audit event emission for all document actions

## Out of Scope
- Core modifications
- Business or compliance decision-making
- Document content editing or deletion
- Free-form file storage without metadata
- Uncontrolled file sharing
- External document repositories

## Governance Rules
- Documents and evidence are append-only
- No document may be modified or deleted once stored
- Metadata is mandatory and immutable
- Records retention is enforced by policy
- All access and uploads are auditable
- Default deny applies to all access

## Dependencies
- Immutable Core (Identity, Auth, Audit, Evidence Doctrine)
- Orders, compliance cases, logistics, finance, disputes (Core-owned)
- Records retention and legal-hold policies (Core-owned)

## Change Control
Once authorised, all changes require a formal Change Control Request (CCR).



Validation Checklist:

Extension purpose clearly records-focused

Append-only and immutability principles explicit

No decision or execution authority implied

Scope boundaries clearly defined

Governance-first positioning preserved
