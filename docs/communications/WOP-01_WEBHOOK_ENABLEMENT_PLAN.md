# WOP-01 — Webhook Live Enablement Plan
Version: v1.0
Status: PHASE 1 PLAN (PRE-ACTIVATION)
Authority Impact: NONE
Build Authorization: NOT GRANTED
Change Control: REQUIRED

## 1) Objective
Define a controlled, reversible rollout plan to enable WeChat webhook processing without introducing mutation surfaces or authority drift.

No domain state mutation is permitted from webhook content.

## 2) Feature Flag Rollout Sequence
### Step A — Baseline (Current)
- `ENABLE_WECHAT_EXTENSION=true` in staging only
- `ENABLE_WECHAT_WEBHOOK=false`
- Unified evidence and audit checks active

### Step B — Staging Webhook Activation
- Keep `ENABLE_WECHAT_EXTENSION=true`
- Set `ENABLE_WECHAT_WEBHOOK=true` in staging
- Validate all Phase 1 checklists before any production change

### Step C — Production Controlled Activation
- Keep feature-gated rollout window (low traffic)
- Set `ENABLE_WECHAT_WEBHOOK=true` in production only after staging PASS
- Monitor for 24-48 hours with rollback readiness

## 3) Staging Activation Checklist
- [ ] Runtime config validates with webhook token present
- [ ] Webhook signature validation rejects invalid signatures
- [ ] Valid signatures are accepted and logged
- [ ] Replay protection blocks duplicate callback processing
- [ ] Callback idempotency confirmed for repeated payloads
- [ ] Inbound payloads recorded immutably before processing
- [ ] Failure paths recorded (no silent drops)
- [ ] `test:wechat` passes
- [ ] `test:audit-comms` passes
- [ ] No webhook-driven domain mutation observed

Staging Gate:
- PASS required on all items before production activation

## 4) Production Activation Checklist
- [ ] Activate in approved low-traffic window
- [ ] Confirm alerting and on-call coverage active
- [ ] Validate signature failures are rejected in live traffic
- [ ] Validate idempotent handling for duplicate callbacks
- [ ] Validate failure recording path in live logs/attestations
- [ ] Validate no mutation of orders/payments/freight/compliance/governance state
- [ ] Validate regulator slice suppression remains intact
- [ ] Validate rollback command path tested and available

Production Gate:
- PASS required for 24-48h observation window

## 5) Signature Validation Steps
- Verify webhook request includes required signed elements
- Validate HMAC/token signature using configured webhook secret/token
- Reject invalid signatures with explicit failure logging
- Reject missing signature inputs with explicit failure logging
- Record accepted/rejected decisions for audit review

## 6) Replay Protection Validation
- Submit duplicate webhook payloads with identical replay keys
- Confirm duplicate is detected and not reprocessed as new
- Confirm replay event is logged as replay/duplicate path
- Confirm replay does not mutate any domain state

## 7) Idempotency Validation
- Replay same callback multiple times
- Confirm only first processing path is treated as primary
- Confirm subsequent callbacks are idempotent no-op outcomes (with logs)
- Confirm dispatch/inbound evidence remains append-only

## 8) Rollback Procedure
Immediate rollback sequence:
1. Set `ENABLE_WECHAT_WEBHOOK=false`
2. Keep `ENABLE_WECHAT_EXTENSION` unchanged unless broader incident requires full disable
3. Preserve all logs, inbound records, and audit artifacts
4. Open incident record with timestamps, scope, and observed failure mode
5. Re-run governance checks before any re-enable attempt

Rollback principle:
- Disable webhook processing first; retain evidence trail

## 9) No Domain Mutation Assertion
The webhook layer is notification and evidence processing only.

Webhook handling must not mutate:
- Orders
- Payments
- Freight
- Compliance
- Governance state

Any requirement to mutate domain state from webhook content requires formal governance reopening.

## 10) Exit Criteria for Phase 1 Plan
- Feature flag rollout sequence documented and approved
- Staging and production checklists complete and testable
- Signature/replay/idempotency validation steps defined
- Rollback procedure defined and reversible
- Explicit no-domain-mutation assertion present
