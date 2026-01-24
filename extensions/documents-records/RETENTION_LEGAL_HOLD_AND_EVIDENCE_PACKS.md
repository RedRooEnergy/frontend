# EXT-14 — Records Retention, Legal Hold & Evidence Packs

Status: GOVERNANCE DRAFT
Extension: EXT-14 — Documents, Evidence & Records Portal
Implementation: NOT AUTHORIZED

## Purpose

This document defines mandatory retention periods, legal-hold controls,
and evidence pack generation rules for records managed under EXT-14.

Records may be relied upon in regulatory, legal, and audit proceedings.

## Core Principles

- Retention is mandatory and policy-driven
- Legal hold overrides retention schedules
- Evidence packs are read-only compilations
- No record is destroyed while under hold
- All actions are auditable

## Retention Categories (Conceptual)

Records MUST be assigned a retention category at creation.

Examples:
- Transactional Records (orders, invoices)
- Compliance & Regulatory Records
- Financial & Settlement Records
- Logistics & Operational Records
- Governance & Legal Records

Retention periods are defined by Core policy
and may vary by jurisdiction.

## Retention Enforcement

The system MUST:
- Prevent deletion before retention expiry
- Automatically flag records eligible for disposal
- Block disposal where legal hold is active
- Retain superseded records until expiry

Retention actions are system-controlled only.

## Legal Hold

Legal hold MAY be applied when:
- A dispute is opened
- A regulator or court requires preservation
- An audit or investigation is active

Legal hold characteristics:
- Applied at record or entity level
- Overrides retention expiry
- Prevents deletion or disposal
- Is explicitly labelled and auditable

Only authorised roles may apply or release legal hold.

## Evidence Packs

An evidence pack is a **read-only, immutable compilation**
of records linked to a specific entity or case.

Evidence packs MAY be generated for:
- Compliance cases
- Financial disputes
- Regulatory audits
- Legal proceedings

Evidence packs MUST:
- Include all linked records at time of generation
- Preserve original metadata and hashes
- Be timestamped and versioned
- Be immutable once generated

Evidence packs MUST NOT:
- Modify or transform source records
- Exclude required records
- Include unlinked or unrelated documents

## Access & Distribution

- Evidence pack access is role- and scope-bound
- External distribution requires explicit authorisation
- Downloads and exports are audited
- Regulator-facing packs are explicitly labelled

## Audit & Traceability

Retention, hold, and evidence pack actions MUST emit audit events:
- RETENTION_POLICY_APPLIED
- LEGAL_HOLD_APPLIED
- LEGAL_HOLD_RELEASED
- EVIDENCE_PACK_GENERATED
- EVIDENCE_PACK_ACCESSED
- EVIDENCE_PACK_EXPORTED

Audit records are immutable and regulator-visible.

## Out of Scope

- Disposal execution mechanisms
- Storage tiering
- Encryption key management
- Evidence pack formatting

These are addressed in Core or infrastructure layers.



Validation Checklist:

Retention and legal-hold rules explicit

Evidence pack immutability enforced

Access and distribution controlled

Audit lifecycle events enumerated

No implementation detail introduced
