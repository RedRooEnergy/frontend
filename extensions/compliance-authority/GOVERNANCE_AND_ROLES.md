# EXT-09 — Governance & Decision Authority Model

Status: GOVERNANCE DRAFT
Extension: EXT-09 — Compliance Authority Experience & Decision Workflows
Implementation: NOT AUTHORIZED

## Role Definition

### Compliance Authority (CA)

A Compliance Authority is a formally authorised actor empowered
to make binding compliance decisions within the RedRooEnergy platform.

Compliance Authorities operate under statutory, regulatory,
or contractually delegated authority.

This role is distinct from:
- Buyer
- Supplier
- Service Partner
- Administrator

## Authority Levels

Compliance Authority roles may be stratified by level,
as determined by Core governance configuration.

Example (conceptual only):
- CA_L1 — Review & Recommendation
- CA_L2 — Approval & Rejection
- CA_L3 — Suspension & Revocation

Authority levels define *what decisions may be made*,
not *how decisions are implemented*.

## Decision Powers

Compliance Authorities MAY:
- Review compliance submissions and evidence
- Issue explicit compliance decisions
- Approve compliance status
- Reject compliance status
- Suspend active compliance
- Revoke previously granted compliance
- Require remediation or resubmission

Compliance Authorities MAY NOT:
- Modify Core rules or policies
- Override audit logging
- Alter historical compliance records
- Act outside delegated authority level
- Bypass evidence requirements

## Decision Characteristics

All compliance decisions:
- Are explicit and intentional
- Are attributable to a Compliance Authority identity
- Require rationale or reason codes
- Are timestamped
- Are immutable once issued

Decisions are authoritative system actions.

## Separation of Duties

- Compliance Authorities do not submit evidence
- Compliance Authorities do not perform operational tasks
- Compliance Authorities do not handle payments or settlement
- Compliance Authorities do not act as Buyers or Suppliers

## Audit & Accountability

Every compliance decision MUST emit:
- Decision type
- Decision outcome
- Rationale or reason code
- Authority identity
- Timestamp
- Affected entity reference

Audit records are immutable and regulator-visible.

## Change Control

Once EXT-09 enters implementation,
this governance document becomes immutable.
Any change requires formal Change Control (CCR).



Validation Checklist:

Role definition explicit and exclusive

Authority boundaries clearly stated

Decision powers unambiguous

Separation of duties enforced

Audit and immutability explicit

