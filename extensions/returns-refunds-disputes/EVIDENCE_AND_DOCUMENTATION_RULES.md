# EXT-15 — Evidence Handling & Dispute Documentation Rules

Status: GOVERNANCE DRAFT
Extension: EXT-15 — Returns, Refunds & Dispute Management
Implementation: NOT AUTHORIZED

## Purpose

This document defines mandatory rules governing evidence and documentation
submitted in support of return, refund, and dispute cases under EXT-15.

All evidence handling under EXT-15 complies with the append-only and
immutability principles enforced by EXT-14 (Documents & Records Portal).

## Core Principles

- Evidence is append-only
- Evidence is immutable once submitted
- No evidence may be edited, replaced, or deleted
- Evidence must be linked to a specific case
- All submissions are auditable and attributable

## Evidence Sources

Evidence MAY be submitted by:
- Buyer (case initiator evidence)
- Supplier (response or counter-evidence)
- Service Partner (inspection or handling evidence)
- System (logs, transaction records, system snapshots)

Evidence MUST NOT be submitted by:
- Finance Authority (decision-only)
- Compliance Authority (decision-only)
- Administrators (except system-generated artefacts)

## Evidence Types (Conceptual)

Examples include:
- Photographs or videos of goods
- Delivery confirmations
- Inspection or damage reports
- Communication records
- Transaction or payment references
- System-generated logs or snapshots

All evidence types must map to approved document and evidence classes.

## Submission Rules

Evidence MAY be submitted only when:
- The case is in a state that permits evidence submission
- The submitter has appropriate role and scope
- Mandatory metadata is provided
- The evidence is explicitly linked to the case ID

Evidence MUST NOT be submitted:
- Outside the case lifecycle
- Without metadata or linkage
- As a replacement for existing evidence
- To influence authority decisions outside formal review

## Evidence Visibility

- Buyers may view evidence they submitted and system-generated evidence
- Suppliers may view evidence related to their products or orders
- Authorities may view all case-linked evidence
- Evidence visibility is role- and scope-bound

No role may hide or suppress evidence once submitted.

## Immutability & Corrections

- Corrections require submission of additional evidence
- Clarifications must reference prior evidence IDs
- No retroactive changes are permitted

## Audit & Traceability

All evidence lifecycle events MUST emit audit events:
- CASE_EVIDENCE_UPLOAD_ATTEMPTED
- CASE_EVIDENCE_SUBMITTED
- CASE_EVIDENCE_REJECTED
- CASE_EVIDENCE_ACCESSED

Audit records include:
- Case ID
- Evidence Record ID
- Submitter identity and role
- Timestamp
- Outcome

## Prohibited Behaviour

The system MUST NOT allow:
- Evidence deletion or modification
- Evidence submission without case linkage
- Suppression of evidence visibility
- Bypass of evidence rules via free-form uploads

## Out of Scope

- File validation or scanning
- Evidence presentation or annotation tools
- Automated evidence analysis
- External evidence repositories

These are enforced by EXT-14 or Core.



Validation Checklist:

Evidence handling aligned with EXT-14

Append-only and immutability enforced

Role-based submission and visibility defined

Audit events enumerated

No implementation detail introduced
