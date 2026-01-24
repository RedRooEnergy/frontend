# EXT-05 — Product Data Model

Status: GOVERNANCE DRAFT

Entity: Product

Core Fields (Immutable after PUBLISHED):
- productId (UUID, system-issued)
- supplierId (UUID)
- sku (string, supplier-defined, unique per supplier)
- name (string)
- categoryId (string)
- attributes (key/value set defined by category template)
- pricingSnapshotId (UUID)
- complianceStatus (enum)
- createdAt (ISO-8601)
- createdBy (actorId)

Mutable Fields (Pre-Publication Only):
- description
- images[]
- documents[]
- attributes (until SUBMITTED)
- draftNotes

System-Controlled Fields:
- state (see Product State Machine)
- publishedAt
- suspendedAt
- retiredAt
- lastStateChangeBy
- lastStateChangeAt

Compliance Fields:
- certifications[]
- testReports[]
- complianceNotes
- complianceReviewedBy
- complianceReviewedAt

Audit Rules:
- Every mutation emits an audit event
- Post-PUBLISHED mutations restricted to SYSTEM suspension/retirement
- Pricing snapshot is read-only once linked
- Deletions are prohibited; RETIRED is terminal state

