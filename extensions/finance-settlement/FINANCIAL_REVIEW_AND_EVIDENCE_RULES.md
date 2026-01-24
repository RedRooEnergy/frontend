# EXT-11 — Financial Review & Evidence Rules

Status: GOVERNANCE DRAFT
Extension: EXT-11 — Finance & Settlement Authority Experience
Implementation: NOT AUTHORIZED

## Purpose

This document defines the mandatory rules for reviewing financial data
and supporting evidence associated with settlement, escrow release,
refunds, adjustments, and disputes under EXT-11.

Financial review is a regulated decision activity,
not an operational or accounting function.

## Core Principles

- Financial data is reviewed, not modified
- Pricing snapshots are immutable and authoritative
- Evidence supports decisions but does not override rules
- Absence of required evidence defaults to denial
- All review actions are auditable

## Financial Evidence Definition

Financial evidence may include (non-exhaustive):
- Payment confirmations
- Escrow balance records
- Pricing snapshot references
- Settlement statements
- Refund or adjustment requests
- Dispute documentation

Evidence is always:
- Core-owned or Core-referenced
- Immutable once recorded
- Attributed and timestamped

## Review Obligations

Finance & Settlement Authorities MUST:
- Verify linkage to a valid pricing snapshot
- Confirm escrow state and amount integrity
- Review all required evidence for the financial case
- Ensure authority level is sufficient for the decision
- Record rationale or reason codes

Finance & Settlement Authorities MUST NOT:
- Assume correctness without evidence
- Approve actions that violate pricing snapshot integrity
- Bypass escrow protections
- Substitute judgement for required controls

## Handling Insufficient or Invalid Evidence

Where evidence is insufficient, inconsistent, or invalid,
Finance & Settlement Authorities MAY:
- Reject the requested financial action
- Request additional information (signal only)
- Maintain escrow hold status

No provisional or conditional approvals are permitted.

## Independence & Integrity

- Financial review must be impartial
- Conflicts of interest must be declared
- Prior financial outcomes do not bias current review
- Decisions must be defensible to auditors and regulators

## Audit & Traceability

Financial review must be traceable to:
- Financial case identifier
- Related transaction or escrow ID
- Pricing snapshot reference
- Decision outcome
- Rationale or reason code
- Authority identity and level
- Timestamp

Audit records are immutable.

## Out of Scope

- Evidence submission mechanisms
- Accounting ledger updates
- Tax or GST determination
- Automated fraud detection
- Payment provider reconciliation logic

These remain Core responsibilities.



Validation Checklist:

Pricing snapshot integrity preserved

Review vs execution clearly separated

Deny-by-default principle enforced

Decision linkage explicit

Audit and regulator defensibility ensured

