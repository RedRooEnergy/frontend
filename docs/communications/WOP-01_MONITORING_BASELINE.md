# WOP-01 — Monitoring Baseline
Version: v1.0
Status: PHASE 2 BASELINE (PRE-ACTIVATION)
Authority Impact: NONE
Build Authorization: NOT GRANTED
Change Control: REQUIRED

## 1) Objective
Define the operational monitoring baseline required before webhook live activation.

This baseline is governance-only and defines what must be measured, when alerts trigger, and how incidents escalate.

## 2) Required Metrics (Explicit)
The following metrics are mandatory for WOP-01 operational readiness:

1. Dispatch success rate (%)
2. Provider failure rate (%)
3. Webhook signature validation failure count and rate
4. Webhook replay/duplicate detection count
5. Callback idempotency suppression count
6. Rate-limit hit frequency
7. Binding conversion rate (PENDING -> VERIFIED)
8. Retry invocation count
9. Inbound callback volume (per time window)
10. Webhook processing error rate (%)
11. Failure recording completeness rate (%)
12. Composite hash verification mismatch count

## 3) Quantified Alert Triggers
### Warning Triggers
- Dispatch success rate < 98% in 15 minutes
- Provider failure rate >= 3% in 5 minutes
- Signature validation failures >= 5 in 10 minutes
- Replay/duplicate detections >= 20 in 10 minutes
- Retry invocation count >= 10 in 15 minutes
- Webhook processing error rate >= 2% in 10 minutes

### Critical/Page Triggers
- Provider failure rate >= 5% in 5 minutes
- Signature validation failures >= 10 in 10 minutes
- Webhook processing error rate >= 5% in 10 minutes
- Failure recording completeness < 100% in any 15-minute window
- Composite hash verification mismatch count > 0 in any 15-minute window
- Evidence of domain mutation from webhook content (immediate page)

## 4) Escalation Path
### Level 1 — On-Call Operations
Trigger: Warning threshold breach.
Actions:
- Acknowledge alert
- Validate metric source and scope
- Correlate with recent deploy/flag activity

### Level 2 — Platform Engineering + Governance Owner
Trigger: Critical threshold breach or repeated warnings.
Actions:
- Begin incident triage
- Assess rollback need (`ENABLE_WECHAT_WEBHOOK=false`)
- Preserve evidence trail and alert timeline

### Level 3 — Program Owner / Compliance Oversight
Trigger: Composite hash mismatch, failure recording gap, or any domain mutation signal.
Actions:
- Immediate containment decision
- Governance incident record opened
- Re-enable blocked pending post-incident signoff

## 5) Monitoring Verification Steps (Pre-Live)
1. Confirm each required metric is observable for staging traffic.
2. Validate warning and critical thresholds produce distinguishable alerts.
3. Validate replay/idempotency counters increment under controlled duplicate input.
4. Validate signature failure counters increment for invalid signatures.
5. Validate failure recording completeness detects simulated failure paths.
6. Validate escalation routing reaches assigned responders.
7. Validate rollback decision path is documented and executable.
8. Record verification evidence as part of WOP-01 checkpoint artifacts.

## 6) Operational Guardrails
- Monitoring must not alter webhook behavior.
- Monitoring must not mutate channel/domain state.
- Monitoring outputs are observational and audit-supporting only.
- Any request to add mutation behavior to monitoring requires governance reopening.

## 7) Exit Criteria (Phase 2)
- All required metrics defined and accepted.
- All threshold triggers quantified.
- Escalation path agreed and role-assigned.
- Monitoring verification steps documented and testable.
- No implementation/tool-specific leakage present.
