# Supplier Onboarding Extension — Data Model Definition

## Purpose
Define the governed data model for suppliers during onboarding.

This model is an **extension model** and must never weaken or bypass Core guarantees
(identity, audit, immutability, authorization).

---

## Core References

This extension depends on:

- Core Identity & Actor Context
- Core Audit Event Contracts
- Core Document Hashing & Immutability
- Core Authorization (default-deny)

No extension data may override Core fields.

---

## Supplier Entity (Supplier)

### Immutable Fields (Set Once)

- supplierId (UUID, system-generated)
- createdAt (UTC timestamp)
- createdByActorId
- createdByRole

These fields MUST NEVER change.

---

### Mutable Fields (Governed)

- legalName
- tradingName
- countryOfIncorporation
- registrationNumber
- taxIdentifier
- contactEmail
- contactPhone
- websiteUrl

All mutations MUST:
- Pass authorization
- Emit an audit event
- Preserve previous values via audit trail

---

### Lifecycle State

- DRAFT
- SUBMITTED
- UNDER_REVIEW
- APPROVED
- REJECTED
- SUSPENDED
- REVOKED

State transitions are governed by:
`02_SUPPLIER_LIFECYCLE_STATES.md`

---

## Compliance Attachments

Suppliers may attach documents:

- Business registration
- Tax certificates
- Compliance certifications

Each attachment MUST:
- Be hashed via Core Document Hashing
- Emit a hash issuance audit event
- Be immutable after acceptance

---

## Derived / Computed Fields

The following are computed and NOT directly writable:

- isActive
- isPayable
- onboardingProgress
- complianceStatus

Derived fields must be calculated from lifecycle state and document status.

---

## Forbidden Fields

The following MUST NOT exist in this extension:

- password
- authentication secrets
- payment instruments
- role assignments

---

## Deletion Rules

Supplier records:
- MUST NOT be deleted
- MUST only transition to terminal states (REVOKED)

---

## Audit Requirements

Every create, update, state transition, or document attachment MUST:

- Emit a defined audit event
- Include requestId and actor context
- Be rejected if audit emission fails

---

## Change Control

This data model is frozen once EXT-01 is activated.

Changes require:
- Approved CCR
- Extension version increment
- Registry update
