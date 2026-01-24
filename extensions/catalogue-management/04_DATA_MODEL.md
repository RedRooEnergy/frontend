EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: Data Model Definition
STATUS: GOVERNANCE DRAFT

CORE DEPENDENCIES
- ActorContext (Core)
- RequestContext (Core)
- Audit Event Emission (Core)
- Authorization (Core default-deny)

ENTITIES

CatalogueDraft
- draftId: string (immutable)
- supplierId: string (immutable)
- status: DRAFT | SUBMITTED | REJECTED | APPROVED
- items: CatalogueItem[]
- createdAt: ISO-8601 timestamp (immutable)
- updatedAt: ISO-8601 timestamp
- submittedAt?: ISO-8601 timestamp
- approvedAt?: ISO-8601 timestamp
- archivedAt?: ISO-8601 timestamp

CatalogueItem
- itemId: string (immutable)
- name: string
- description: string
- category: string
- attributes: Record<string, string | number | boolean>
- complianceRefs: string[]
- price: number
- currency: ISO-4217
- active: boolean

CataloguePublication
- catalogueId: string (immutable)
- supplierId: string (immutable)
- version: integer (monotonic)
- publishedAt: ISO-8601 timestamp
- archivedAt?: ISO-8601 timestamp
- items: CatalogueItem[]

IMMUTABILITY RULES

- draftId, itemId, catalogueId are immutable
- Published catalogues are read-only
- Re-publication creates a new version
- Historical versions are never modified

STORAGE RULES

- Drafts stored separately from published catalogues
- No hard deletes; archive only
- All transitions require audit emission
