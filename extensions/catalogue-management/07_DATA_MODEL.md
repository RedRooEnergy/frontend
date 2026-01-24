EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: Data Model
STATUS: GOVERNANCE DRAFT

PRIMARY ENTITY

Catalogue

FIELDS (IMMUTABLE ONCE PUBLISHED)

catalogueId: string (UUID, system-generated)
supplierId: string (foreign key to Supplier Registry)
status: DRAFT | SUBMITTED | APPROVED | REJECTED | PUBLISHED | ARCHIVED
version: number (monotonic increment on each mutation)
createdAt: ISO-8601 timestamp
createdBy: actorId
lastModifiedAt: ISO-8601 timestamp
lastModifiedBy: actorId

CONTENT FIELDS

title: string
description: string
categories: string[]
products: ProductRef[]
pricingRulesRef: string (reference only; no pricing logic here)
complianceBundleRef: string (reference to compliance artefacts)

AUDIT FIELDS (READ-ONLY)

auditTrailRef: string (pointer to immutable audit records)
hashRef: string (document hash ID once published)

RULES

- catalogueId is assigned once and never reused
- status transitions must follow lifecycle rules (see 02_LIFECYCLE_STATES.md)
- PUBLISHED catalogues are immutable
- ARCHIVED catalogues may not be reactivated
- All mutations increment version and emit audit events
