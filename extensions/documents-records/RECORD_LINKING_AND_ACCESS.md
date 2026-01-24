# EXT-14 — Records Linking, Ownership & Access Boundaries

Status: GOVERNANCE DRAFT
Extension: EXT-14 — Documents, Evidence & Records Portal
Implementation: NOT AUTHORIZED

## Purpose

This document defines how records are linked to Core entities,
who is considered the owner or custodian of records,
and the access boundaries that strictly govern visibility and use.

EXT-14 is a controlled records portal, not a file-sharing system.

## Core Principles

- Records are owned by the platform (custodial ownership)
- Users are granted scoped access, not ownership
- Linking is explicit and immutable
- Access is role-, scope-, and context-bound
- Default deny applies at all times

## Record Linking Model

Every record MUST be linked to at least one Core entity.

Supported link targets include (non-exhaustive):
- Order
- Product
- Supplier
- Buyer
- Compliance Case
- Financial Case
- Shipment / Consignment
- Dispute
- Governance Artefact

Link characteristics:
- Links are immutable once created
- A record may be linked to multiple entities
- Links must reference valid Core entity IDs
- Orphaned records are prohibited

## Ownership & Custodianship

- RedRooEnergy (platform operator) is the legal custodian of all records
- Users are not owners of records they upload
- Uploading a document does not grant deletion or edit rights
- Custodianship ensures retention, integrity, and regulator access

## Access Boundaries by Role (Conceptual)

### Buyer
- View documents linked to their own orders
- View invoices, receipts, delivery confirmations
- No upload or deletion rights unless explicitly authorised

### Supplier
- Upload and view documents linked to their products or orders
- View compliance-related evidence they submitted
- No access to buyer-only or platform governance records

### Service Partner
- Upload evidence for assigned tasks only
- View evidence linked to their assignments
- No access beyond assignment scope

### Freight & Logistics Operator
- Upload and view logistics documents for assigned shipments
- View shipping-related records only
- No access to compliance or financial records

### Compliance Authority
- View all compliance-linked records
- View supporting and system-generated evidence
- No modification or deletion rights

### Finance & Settlement Authority
- View all finance- and settlement-linked records
- View evidence packs for disputes or audits
- No modification or deletion rights

### Administrator / Executive
- Platform-wide read access, subject to scope
- Evidence pack generation
- Legal-hold and retention oversight

## Prohibited Behaviour

The system MUST NOT allow:
- Cross-entity access without explicit linkage
- Access to records outside role and scope
- Sharing of direct file URLs
- Bulk export without authorisation
- Modification or deletion of records

## Audit & Traceability

All record access and linkage actions MUST emit audit events:
- RECORD_LINKED
- RECORD_ACCESSED
- RECORD_ACCESS_DENIED
- RECORD_EXPORT_REQUESTED

Audit records are immutable and regulator-visible.

## Out of Scope

- Permission engine implementation
- File download mechanisms
- External sharing workflows
- Third-party document portals

These are addressed in Core or later implementation phases.



Validation Checklist:

Record linking rules explicit

Custodial ownership clearly defined

Role-based access boundaries enforced conceptually

Prohibited behaviours explicit

Audit requirements enumerated
