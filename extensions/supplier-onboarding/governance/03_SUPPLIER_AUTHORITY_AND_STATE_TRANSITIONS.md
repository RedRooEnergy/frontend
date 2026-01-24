# Supplier Onboarding Extension — Authority & State Transition Matrix

## Purpose
Define who is authorised to move a Supplier between lifecycle states, under what conditions, and with what mandatory audit and evidence requirements.

This document is authoritative for EXT-01.

---

## Roles (Fixed)

- SYSTEM
- SUPPLIER
- COMPLIANCE_AUTHORITY
- ADMINISTRATOR

No other roles may perform state transitions.

---

## Supplier Lifecycle States

- DRAFT
- SUBMITTED
- UNDER_REVIEW
- APPROVED
- REJECTED
- SUSPENDED
- REVOKED

---

## State Transition Matrix

| From State | To State | Allowed Actor | Preconditions | Audit Required |
|-----------|----------|---------------|---------------|----------------|
| DRAFT | SUBMITTED | SUPPLIER | Required identity + documents uploaded | YES |
| SUBMITTED | UNDER_REVIEW | SYSTEM | Automatic intake validation passed | YES |
| UNDER_REVIEW | APPROVED | COMPLIANCE_AUTHORITY | All compliance checks passed | YES |
| UNDER_REVIEW | REJECTED | COMPLIANCE_AUTHORITY | Rejection reason recorded | YES |
| APPROVED | SUSPENDED | COMPLIANCE_AUTHORITY | Compliance breach detected | YES |
| APPROVED | REVOKED | COMPLIANCE_AUTHORITY | Severe or irreversible breach | YES |
| SUSPENDED | APPROVED | COMPLIANCE_AUTHORITY | Remediation verified | YES |

---

## Forbidden Transitions

The following are **explicitly prohibited**:

- SUPPLIER approving themselves
- ADMINISTRATOR changing compliance states
- Any role reverting REVOKED to another state
- Any state mutation without an audit event

Violations must raise a CORE error and emit a SECURITY audit event.

---

## Audit & Immutability Rules

- Every transition MUST emit a scoped audit event
- Transition events are immutable once recorded
- Actor identity and requestId are mandatory
- State history is append-only

---

## Change Control

This document is frozen once EXT-01 is activated.

Changes require:
- Approved CCR
- Updated extension version
- Re-registration in EXTENSIONS_REGISTRY.md
