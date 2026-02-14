# WOP-01 — Operational Freeze Checklist
Version: v1.0
Status: OPERATIONAL FREEZE (PRE-WEBHOOK ENABLEMENT)
Authority Impact: NONE
Build Authorization: NOT GRANTED
Change Control: REQUIRED

## 1) Current Operational State Confirmation

The following conditions must be verified before any webhook enablement:

- ENABLE_WECHAT_EXTENSION = true (staging only)
- ENABLE_WECHAT_WEBHOOK = false
- Unified read-only evidence dashboard operational
- test:audit-comms passing
- No audit-comms mutation endpoints exist
- EXT-WECHAT-01 and EXT-AUDIT-COMMS-01 Gates 1–5 locked in registry

Verification Result:
☐ Confirmed

---

## 2) Locked Non-Regression Constraints

The following constraints are frozen and may not be altered during WOP-01:

- No mutation surface expansion
- No new state transitions introduced
- No unified mutable datastore
- Webhook must not mutate domain state
- All inbound events logged before processing
- Idempotency required for callbacks
- All failures must be recorded
- Composite hash doctrine unchanged
- Regulator slice suppression unchanged
- No raw bodies exposed to regulator
- No collapse of Email + WeChat into a unified authority store

---

## 3) Webhook Behavior Constraints (Pre-Activation)

Before enabling webhook:

- Signature validation must be enforced
- Invalid signatures must be rejected
- Replay protection required
- No inbound message content may alter:
  - Orders
  - Payments
  - Freight
  - Compliance
  - Governance state
- All inbound payloads must be recorded immutably

---

## 4) Operational Audit Requirements

During WOP-01 execution:

- CompositeEvidenceHash must remain reproducible
- ScopeLabel and CompletenessLabel must always be present
- Failure conditions must be logged
- Retry behavior must remain bounded
- No silent drops permitted

---

## 5) Change Control Trigger

If any of the following are requested, WOP-01 must halt and governance must reopen:

- Mutation of domain state from webhook
- Addition of resend/retry mutation endpoints
- Exposure of raw message bodies to regulator
- Removal or weakening of hash doctrine
- Addition of unified mutable storage

---

## 6) Freeze Declaration

This checklist formally freezes operational behavior prior to webhook enablement.

No boundary expansion is permitted without formal change control.
