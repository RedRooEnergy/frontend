# Governance Baseline Declaration — Investor Grade (v1.0)

Version: v1.0  
Status: ACTIVE (Investor-grade compliance)  
Repository: RedRooEnergy/frontend  
Default branch: main

## 1. Purpose

This declaration defines the enforced governance baseline for the RedRooEnergy frontend platform.  
It provides investors a verifiable, immutable reference for:

- Control scope (what is governed)
- Control enforcement (what blocks merges)
- Evidence (what is immutable and hash-verifiable)
- Exception handling (how deviations are controlled)
- The planned progression to regulator-ready posture

This baseline is designed to prevent silent control drift.

## 2. Baseline Identity (Immutable References)

### 2.1 Consolidated governance release tag (authoritative)
- Tag: marketplace-governance-v1.0.0  
- Meaning: consolidated, enforced governance baseline across Buyer + Freight + Installer audits (PASS-1 PASS)

### 2.2 Subsystem release tags (component baselines)
- Installer Onboarding: installer-onboarding-v1.0.0  
- Freight & Customs: freight-customs-audit-v1.0.0  
- Buyer Onboarding: buyer-onboarding-audit-v1.0.0  

Each subsystem tag references:
- PASS-1 status at freeze time
- runId
- scorecard path
- PDF path
- SHA-256 path
- CI posture note

## 3. Enforced Controls (What is governed)

The governance baseline is enforced via three deterministic audit suites:

1) Installer Onboarding Audit  
2) Freight & Customs Audit  
3) Buyer Onboarding Audit  

These suites verify, at minimum:
- Role gating and isolation
- Deterministic onboarding and eligibility controls
- Deterministic order invariants (pricing snapshot + timeline)
- Deterministic escrow/hold observability (where in scope)
- Deterministic evidence projection and non-leakage
- Deterministic admin replay/traceability (where in scope)
- Evidence artefacts (HTML → Chromium → PDF + SHA-256) for each run

## 4. Merge Enforcement (Branch Protection Baseline)

Branch protection on `main` is configured such that merges require:

- Required status checks (strict = true):
  - Buyer Onboarding Audit (Blocking)
  - Freight & Customs Audit (Blocking)
  - Installer Onboarding Audit (Blocking)

- Required conversation resolution: true  
- Force pushes: false  
- Deletions: false  
- Admin bypass: currently permitted (enforce_admins = false)

This configuration constitutes "Investor-grade enforcement": control drift is blocked under normal operations.

## 5. Evidence and Immutability Rules

For each audit run, the evidence outputs are:

- JSON scorecard (per-check outcomes + overall)
- One-page PDF summary generated from deterministic HTML
- SHA-256 hash file for the PDF

Evidence is treated as immutable by convention:
- Historical artefacts are not overwritten.
- Tags pin the baseline state and reference the evidence artefacts.

## 6. Exception Handling (Break-Glass SOP)

Exceptions are permitted only under controlled conditions and must follow the Break-Glass procedure defined in:
- BREAK_GLASS_EXCEPTION_SOP.md

No exception may be executed without:
- a documented rationale
- a time-bounded reversion plan
- a follow-up remediation and re-enablement path

## 7. Planned Transition to Regulator-Ready Posture

Regulator-ready posture requires two upgrades:

1) Non-bypassable enforcement:
   - Set branch protection `enforce_admins = true` on main
   - Admins cannot merge without all required checks passing

2) Formal exception/change-control policy:
   - Adopt the Break-Glass SOP as mandatory policy
   - Require recorded approvals and post-incident closure documentation

Timing rule:
- After one stable operating cycle (no emergency exceptions; consistent PASS outcomes), enable enforce_admins = true and issue a regulator-ready declaration.

## 8. Declaration

This governance baseline is active and enforced on the repository's main branch.  
Any deviation from this baseline must follow the Break-Glass SOP or formal change control.

Signed-off (operational owner): ____________________  
Date (UTC): ____________________
