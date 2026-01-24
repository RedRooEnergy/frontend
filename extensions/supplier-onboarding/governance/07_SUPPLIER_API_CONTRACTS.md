# Supplier Onboarding Extension — API Contracts (Governance)

## Purpose
Define immutable, implementation-agnostic API contracts for EXT-01.

These contracts:
- Bind future backend implementations
- Must respect Core authorization, audit, and immutability rules
- Must not leak internal data models
- Are not REST prescriptions; they are behavioral contracts

---

## Global Contract Rules

1. Every request MUST include:
   - Actor Context (derived, not client-supplied)
   - requestId
2. Every response MUST be deterministic and auditable.
3. Errors MUST be normalized via Core error middleware.
4. No endpoint may mutate state without emitting an audit event.
5. Authorization is evaluated before business logic.

---

## Supplier Lifecycle Endpoints

### Create Supplier

Action:
- SUPPLIER_CREATE

Contract:
- Input: none (identity-derived)
- Output:
  - supplierId
  - state = DRAFT
  - createdAt

Errors:
- AUTH_DENIED
- INVALID_REQUEST (supplier already exists)

Audit:
- SUPPLIER_CREATED

---

### Update Supplier Profile

Action:
- SUPPLIER_UPDATE_PROFILE

Contract:
- Input:
  - profile fields (governed subset only)
- Output:
  - supplierId
  - updatedFields
  - updatedAt

Errors:
- AUTH_DENIED
- INVALID_STATE

Audit:
- SUPPLIER_PROFILE_UPDATED

---

### Submit Supplier for Review

Action:
- SUPPLIER_SUBMIT

Contract:
- Input: none
- Output:
  - supplierId
  - state = SUBMITTED
  - submittedAt

Errors:
- AUTH_DENIED
- INVALID_STATE
- MISSING_DOCUMENTS

Audit:
- SUPPLIER_SUBMITTED

---

### View Supplier (Self)

Action:
- SUPPLIER_VIEW_SELF

Contract:
- Input: none
- Output:
  - supplierId
  - profile snapshot
  - state
  - timestamps

Errors:
- AUTH_DENIED

Audit:
- SUPPLIER_VIEWED_SELF (optional, configurable)

---

### View Supplier (Any)

Action:
- SUPPLIER_VIEW_ANY

Contract:
- Input:
  - supplierId
- Output:
  - supplierId
  - profile snapshot
  - state
  - compliance status
  - audit metadata (read-only)

Errors:
- AUTH_DENIED
- NOT_FOUND

Audit:
- SUPPLIER_VIEWED

---

## Review & Governance Endpoints

### Start Review

Action:
- SUPPLIER_REVIEW_START

Contract:
- Input:
  - supplierId
- Output:
  - supplierId
  - state = UNDER_REVIEW
  - reviewerId

Errors:
- AUTH_DENIED
- INVALID_STATE

Audit:
- SUPPLIER_REVIEW_STARTED

---

### Request Changes

Action:
- SUPPLIER_REQUEST_CHANGES

Contract:
- Input:
  - supplierId
  - reasonCode
  - notes
- Output:
  - supplierId
  - state = CHANGES_REQUIRED

Errors:
- AUTH_DENIED
- INVALID_STATE

Audit:
- SUPPLIER_CHANGES_REQUESTED

---

### Approve Supplier

Action:
- SUPPLIER_APPROVE

Contract:
- Input:
  - supplierId
- Output:
  - supplierId
  - state = APPROVED
  - approvedAt

Errors:
- AUTH_DENIED
- INVALID_STATE
- COMPLIANCE_INCOMPLETE

Audit:
- SUPPLIER_APPROVED

---

### Reject Supplier

Action:
- SUPPLIER_REJECT

Contract:
- Input:
  - supplierId
  - reasonCode
  - notes
- Output:
  - supplierId
  - state = REJECTED

Errors:
- AUTH_DENIED
- INVALID_STATE

Audit:
- SUPPLIER_REJECTED

---

## Document Endpoints

### Upload Document

Action:
- SUPPLIER_DOCUMENT_UPLOAD

Contract:
- Input:
  - documentType
  - file (binary handled out-of-band)
- Output:
  - documentId
  - documentHash
  - status = PENDING

Errors:
- AUTH_DENIED
- INVALID_STATE

Audit:
- SUPPLIER_DOCUMENT_UPLOADED

---

### Accept Document

Action:
- SUPPLIER_DOCUMENT_ACCEPT

Contract:
- Input:
  - documentId
- Output:
  - documentId
  - status = ACCEPTED

Errors:
- AUTH_DENIED
- INVALID_STATE

Audit:
- SUPPLIER_DOCUMENT_ACCEPTED

---

### Reject Document

Action:
- SUPPLIER_DOCUMENT_REJECT

Contract:
- Input:
  - documentId
  - reasonCode
- Output:
  - documentId
  - status = REJECTED

Errors:
- AUTH_DENIED
- INVALID_STATE

Audit:
- SUPPLIER_DOCUMENT_REJECTED

---

## Change Control

This contract is frozen once EXT-01 enters implementation.

Any change requires:
- Approved CCR
- Extension version increment
- Registry update
