# Staging UAT Test Scripts — Supplier & Admin Phases
Version: v1.0 (DRAFT — Testing Only)  
Implementation changes: Not authorised

Scope
- Supplier phase: onboarding, capability declaration, product lifecycle, fulfilment milestones, payout readiness gating.
- Admin phase: disputes, compliance approvals, audit exports.
- Environment: Staging with feature flags enabled (NEXT_PUBLIC_SUPPLIER_PHASE=on, NEXT_PUBLIC_ADMIN_PHASE=on).

Instructions
- No production keys; staging/test data only.
- Capture screenshots/log excerpts; redact PII/secrets.
- Record audit event checks per step.

Test Cases (summary)
- SUP-01 Supplier onboarding (KYB/beneficiary match, rails, AUD required, prepayment waiver requires approvalId).
- SUP-02 Capability declaration saved & audited (SUPPLIER_ONBOARDING_COMPLETED, SUPPLIER_CAPABILITY_DECLARED).
- SUP-03 Product lifecycle transitions obey evidence gates (certs for APPROVED; pricing snapshot for SALE).
- SUP-04 Weekly deal nomination enforces single slot and price requirements.
- SUP-05 Shipment milestones enforce order (PICKUP→EXPORT_CLEARANCE→IN_TRANSIT→DELIVERED) and evidence for delivered.
- SUP-06 Payout readiness shows blocked/ready status based on gates.
- ADM-01 Dispute creation and status changes with audit (ADMIN_DISPUTE_UPDATED).
- ADM-02 Compliance approval/rejection with rationale required (ADMIN_COMPLIANCE_DECIDED).
- ADM-03 Audit exports generate hash records (ADMIN_EXPORT_GENERATED) without secrets.
- ADM-04 Admin dashboard gated by feature flag; banner visible in non-prod.

For each TC
- Preconditions
- Steps
- Expected results
- Evidence to capture (screenshot/log/audit IDs)
- Pass/Fail

Evidence placeholders
- Screenshot: /evidence/<TC>/img-<n>.png (not stored here)
- Logs: /evidence/<TC>/log-<n>.txt
- Audit sample: paste last 5 relevant events (IDs only)
