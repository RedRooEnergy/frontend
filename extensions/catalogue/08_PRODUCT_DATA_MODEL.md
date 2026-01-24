# EXT-05 — Product Data Model

Status: GOVERNANCE DRAFT

Entity: Product

Core Fields:
- productId (string, immutable)
- supplierId (string, immutable)
- status (enum: lifecycle state)
- name (string)
- description (string)
- category (string)
- attributes (key-value map)
- certifications (list of certification refs)
- createdAt (timestamp, immutable)
- updatedAt (timestamp)

Immutability Rules:
- productId and supplierId never change
- createdAt never changes
- status changes only via valid lifecycle transitions
- Attribute changes allowed only in DRAFT state

Audit Requirements:
- All mutations emit DATA_MUTATION audit events
- Hashing applied at PUBLISHED state
- Hash stored in audit store, not product record

