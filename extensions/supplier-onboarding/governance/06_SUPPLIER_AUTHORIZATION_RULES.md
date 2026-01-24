# Supplier Onboarding Extension — Authorization Rules

## Purpose
Define explicit, testable authorization rules for EXT-01 actions.

Default posture is CLOSED.
Anything not explicitly allowed is denied.

This extension must not weaken Core:
- Identity
- Actor Context
- Default-deny authorization boundary
- Audit emission requirements

---

## Roles (Authoritative)

- SYSTEM
- ADMINISTRATOR
- COMPLIANCE_AUTHORITY
- SUPPLIER

No other roles exist.

---

## Resources (EXT-01)

- Supplier (supplier record)
- SupplierDocument (supplier compliance attachment)
- SupplierStateTransition (lifecycle transition event)

---

## Actions (EXT-01)

Supplier:
- SUPPLIER_CREATE
- SUPPLIER_UPDATE_PROFILE
- SUPPLIER_SUBMIT
- SUPPLIER_VIEW_SELF

Governance / Review:
- SUPPLIER_VIEW_ANY
- SUPPLIER_REVIEW_START
- SUPPLIER_REQUEST_CHANGES
- SUPPLIER_APPROVE
- SUPPLIER_REJECT
- SUPPLIER_SUSPEND
- SUPPLIER_REVOKE

Documents:
- SUPPLIER_DOCUMENT_UPLOAD
- SUPPLIER_DOCUMENT_VIEW_SELF
- SUPPLIER_DOCUMENT_VIEW_ANY
- SUPPLIER_DOCUMENT_ACCEPT
- SUPPLIER_DOCUMENT_REJECT

---

## General Rules (Always)

1. All decisions require Actor Context + requestId.
2. All allowed actions MUST emit an audit event.
3. If audit emission fails, the action is denied.
4. A SUPPLIER can only act on their own supplierId.
5. Only SYSTEM/ADMINISTRATOR/COMPLIANCE_AUTHORITY may act on other supplier records.

---

## Allow Rules Matrix

### SUPPLIER role
Allowed only:

- SUPPLIER_CREATE (only if no supplier exists yet for that actor)
- SUPPLIER_UPDATE_PROFILE (only when state = DRAFT or CHANGES_REQUIRED)
- SUPPLIER_SUBMIT (only when state = DRAFT or CHANGES_REQUIRED)
- SUPPLIER_VIEW_SELF (always)

Documents (self only):
- SUPPLIER_DOCUMENT_UPLOAD (only when state = DRAFT or CHANGES_REQUIRED)
- SUPPLIER_DOCUMENT_VIEW_SELF (always)

Denied:
- Any approval/rejection/suspension/revocation
- Viewing other suppliers
- Accept/reject documents

---

### COMPLIANCE_AUTHORITY role
Allowed:

- SUPPLIER_VIEW_ANY
- SUPPLIER_REVIEW_START (only when state = SUBMITTED)
- SUPPLIER_REQUEST_CHANGES (only when state = UNDER_REVIEW)
- SUPPLIER_APPROVE (only when state = UNDER_REVIEW and compliance complete)
- SUPPLIER_REJECT (only when state = UNDER_REVIEW)

Documents:
- SUPPLIER_DOCUMENT_VIEW_ANY
- SUPPLIER_DOCUMENT_ACCEPT
- SUPPLIER_DOCUMENT_REJECT

Denied:
- Direct profile edits
- Creating suppliers

---

### ADMINISTRATOR role
Allowed:

- SUPPLIER_VIEW_ANY
- SUPPLIER_SUSPEND (only when state = APPROVED)
- SUPPLIER_REVOKE (any non-terminal state)

Documents:
- SUPPLIER_DOCUMENT_VIEW_ANY

Denied:
- Approve/reject supplier compliance (reserved for COMPLIANCE_AUTHORITY)
- Accept/reject compliance documents

---

### SYSTEM role
Allowed:

- All actions, but only for automated tasks explicitly defined in governance.
- SYSTEM actions MUST emit SYSTEM_EVENT audit events.

---

## State Preconditions

State constraints are binding:

- DRAFT: supplier edits + uploads allowed
- SUBMITTED: supplier edits denied; review may begin
- UNDER_REVIEW: supplier edits denied; compliance authority actions allowed
- APPROVED: supplier edits restricted; admin can suspend; system can monitor
- REJECTED: terminal; only view allowed
- SUSPENDED: restricted; admin may reinstate via separate governed procedure
- REVOKED: terminal; only view allowed

---

## Change Control
This file is frozen once EXT-01 is activated.

Any change requires:
- Approved CCR
- Extension version increment
- Registry update
