# EXT-14 — Evidence Upload, Append-Only & Immutability Rules

Status: GOVERNANCE DRAFT
Extension: EXT-14 — Documents, Evidence & Records Portal
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory rules governing evidence upload,
append-only behaviour, and immutability guarantees under EXT-14.

Evidence integrity is a non-negotiable governance requirement.

## Core Principles

- Evidence is append-only
- Evidence is immutable once stored
- No overwrite, replacement, or deletion
- Corrections are handled by additional evidence
- All uploads are auditable and attributable

## Evidence Upload Rules

Evidence MAY be uploaded only when:
- The uploader has an active role and scope
- The upload is linked to a valid Core entity
- Mandatory metadata is provided and valid
- The upload context is explicitly authorised

Evidence MUST NOT be uploaded:
- Without metadata
- Without entity linkage
- Outside role or assignment scope
- As a replacement for existing evidence

## Append-Only Enforcement

Once an evidence record is stored:
- Content cannot be changed
- Metadata cannot be altered
- Links cannot be removed
- Retention category cannot be downgraded

Any correction or clarification requires:
- A new evidence record
- A new record ID
- Independent metadata and audit trail

## Immutability Guarantees

The system MUST enforce:
- Write-once semantics
- Content hashing and verification
- Immutable timestamps
- Tamper-evident storage behaviour

Any attempt to modify or delete evidence MUST:
- Be rejected
- Emit an audit event
- Be treated as a policy violation

## Role-Specific Upload Constraints

- Buyers: Upload only where explicitly permitted (e.g. dispute evidence)
- Suppliers: Upload compliance and order-related evidence only
- Service Partners: Upload evidence for assigned tasks only
- Logistics Operators: Upload shipment-related evidence only
- Compliance & Finance Authorities: No upload rights (review-only)
- Administrators: System-level uploads only, fully audited

## Failure Handling

- Invalid uploads fail closed
- Partial uploads are rejected
- No silent acceptance
- Errors must be explicit and logged

## Audit & Traceability

Every evidence upload MUST emit audit events:
- EVIDENCE_UPLOAD_ATTEMPTED
- EVIDENCE_UPLOADED
- EVIDENCE_UPLOAD_REJECTED

Audit records include:
- Record ID
- Uploader identity and role
- Linked entity reference
- Timestamp
- Outcome

## Out of Scope

- File size limits
- File type validation
- Malware scanning
- Storage backend enforcement

These are addressed in Core or infrastructure layers.



Validation Checklist:

Append-only and immutability rules explicit

Role-specific upload constraints defined

Failure handling fail-closed

Audit lifecycle events enumerated

No implementation detail introduced
