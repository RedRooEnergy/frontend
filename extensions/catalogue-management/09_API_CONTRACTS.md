EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: API Contracts
STATUS: GOVERNANCE DRAFT

PRINCIPLES

- Contracts are read-only definitions
- No business logic in contracts
- Extensions must not expose internal storage structures
- Contracts are versioned and immutable once published

BASE TYPES

CatalogueId: string (immutable)
SupplierId: string (immutable)
RequestId: string (immutable, Core-issued)
Timestamp: ISO-8601 string

ENUMS

CatalogueStatus
- DRAFT
- SUBMITTED
- APPROVED
- REJECTED
- PUBLISHED
- ARCHIVED

REQUEST CONTRACTS

CreateCatalogueDraftRequest
- name: string
- description: string

SubmitCatalogueRequest
- catalogueId: CatalogueId

ApproveCatalogueRequest
- catalogueId: CatalogueId

RejectCatalogueRequest
- catalogueId: CatalogueId
- reason: string

PublishCatalogueRequest
- catalogueId: CatalogueId

RESPONSE CONTRACTS

CatalogueSummary
- catalogueId: CatalogueId
- supplierId: SupplierId
- status: CatalogueStatus
- createdAt: Timestamp
- updatedAt: Timestamp

CatalogueDetail extends CatalogueSummary
- name: string
- description: string
- complianceStatus: string
- documentsAttached: number

ERROR CONTRACTS

StandardError
- error: string
- message: string
- requestId: RequestId

AUDIT BINDING

- All write operations MUST include requestId
- Responses MUST NOT include audit internals
- Error responses MUST conform to StandardError
