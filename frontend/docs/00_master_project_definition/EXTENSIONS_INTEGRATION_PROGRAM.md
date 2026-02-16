# Extensions Integration Program
Version: v1.0 (LOCKED)  
Scope: Registry, wave plan, integration sequence for EXT-01 … EXT-30  
Code/Governance Changes: None — planning artefact only

## Registry (EXT-01 … EXT-30)
| EXT | Governance Status | Implementation Plan Status | Implementation Status | Feature Flag (prod default) | Dependencies | Risk Class | Required Evidence Pack | Target Wave |
| --- | ----------------- | -------------------------- | --------------------- | --------------------------- | ------------ | ---------- | ---------------------- | ----------- |
| EXT-01 | LOCKED | Approved | Not started | Off | — | M | UAT + Audit | Wave 0 |
| EXT-02 | LOCKED | Draft | Not started | Off | EXT-01 | M | UAT + Audit | Wave 1 |
| EXT-03 | LOCKED | Draft | Not started | Off | EXT-01 | M | UAT + Audit | Wave 1 |
| EXT-04 | LOCKED | Draft | Not started | Off | EXT-01 | M | UAT + Audit | Wave 1 |
| EXT-05 | LOCKED | Draft | Not started | Off | EXT-01 | M | UAT + Audit | Wave 1 |
| EXT-06 | LOCKED | Draft | Not started | Off | EXT-02, EXT-03 | H | UAT + Pen + Audit | Wave 2 |
| EXT-07 | LOCKED | Draft | Not started | Off | EXT-02, EXT-04 | M | UAT + Audit | Wave 2 |
| EXT-08 | LOCKED | Draft | Not started | Off | EXT-03 | M | UAT + Audit | Wave 2 |
| EXT-09 | LOCKED | Draft | Not started | Off | EXT-04 | M | UAT + Audit | Wave 2 |
| EXT-10 | LOCKED | Draft | Not started | Off | EXT-05 | M | UAT + Audit | Wave 2 |
| EXT-11 | LOCKED | Draft | Not started | Off | EXT-06 | H | UAT + Pen + Audit | Wave 3 |
| EXT-12 | LOCKED | Draft | Not started | Off | EXT-06, EXT-07 | H | UAT + Pen + Audit | Wave 3 |
| EXT-13 | LOCKED | Draft | Not started | Off | EXT-07, EXT-08 | M | UAT + Audit | Wave 3 |
| EXT-14 | LOCKED | Draft | Not started | Off | EXT-08, EXT-09 | M | UAT + Audit | Wave 3 |
| EXT-15 | LOCKED | Draft | Not started | Off | EXT-09 | M | UAT + Audit | Wave 3 |
| EXT-16 | LOCKED | Draft | Not started | Off | EXT-10 | M | UAT + Audit | Wave 3 |
| EXT-17 | LOCKED | Draft | Not started | Off | EXT-11 | H | UAT + Pen + Audit | Wave 4 |
| EXT-18 | LOCKED | Draft | Not started | Off | EXT-12 | H | UAT + Pen + Audit | Wave 4 |
| EXT-19 | LOCKED | Draft | Not started | Off | EXT-13 | M | UAT + Audit | Wave 4 |
| EXT-20 | LOCKED | Draft | Not started | Off | EXT-14 | M | UAT + Audit | Wave 4 |
| EXT-21 | LOCKED | Draft | Not started | Off | EXT-15 | M | UAT + Audit | Wave 4 |
| EXT-22 | LOCKED | Draft | Not started | Off | EXT-16 | M | UAT + Audit | Wave 4 |
| EXT-23 | LOCKED | Draft | Not started | Off | EXT-17 | H | UAT + Pen + Audit | Wave 4 |
| EXT-24 | LOCKED | Draft | Not started | Off | EXT-18 | H | UAT + Pen + Audit | Wave 4 |
| EXT-25 | LOCKED | Draft | Not started | Off | EXT-19 | M | UAT + Audit | Wave 4 |
| EXT-26 | LOCKED | Draft | Not started | Off | EXT-20 | M | UAT + Audit | Wave 4 |
| EXT-27 | LOCKED | Draft | Not started | Off | EXT-21 | M | UAT + Audit | Wave 4 |
| EXT-28 | LOCKED | Draft | Not started | Off | EXT-22 | M | UAT + Audit | Wave 4 |
| EXT-29 | LOCKED | Draft | Not started | Off | EXT-23 | H | UAT + Pen + Audit | Wave 4 |
| EXT-30 | LOCKED | Draft | Not started | Off | EXT-24 | H | UAT + Pen + Audit | Wave 4 |

Notes  
- Governance Status reflects whether governance exists; “LOCKED” means change control required.  
- Implementation Plan Status: “Draft” unless explicitly approved.  
- Implementation Status: none executed yet.  
- Feature Flag: default Off in production; staging-only enablement for UAT.  
- Risk Class: H = High (security/financial), M = Medium.  
- Required Evidence Pack: UAT + Audit; Pen where high risk/security.  

## Wave Plan (dependency-based)
- Wave 0: EXT-01 (foundation/registry enablement)  
- Wave 1: EXT-02, EXT-03, EXT-04, EXT-05 (depend only on EXT-01)  
- Wave 2: EXT-06, EXT-07, EXT-08, EXT-09, EXT-10 (build on Wave 1 branches)  
- Wave 3: EXT-11, EXT-12, EXT-13, EXT-14, EXT-15, EXT-16 (depend on Wave 2 completions)  
- Wave 4: EXT-17 … EXT-30 (fan-out from Wave 3; all remaining items)  

Rationale: Each wave closes dependencies from earlier waves to avoid dead-ends and partial integrations.

## Integration Sequence (strict, stop/go gates)
1) Lock governance per EXT (if not already locked); no plan/implementation before lock.  
2) For each Wave (0 → 4):  
   - Finalise Implementation Plan for all EXT in wave.  
   - Enable feature flags in staging only.  
   - Implement per plan; keep prod flags Off.  
   - Run UAT with evidence pack (screenshots/logs/audit IDs, hashes).  
   - Produce UAT report and obtain sign-off.  
   - Lock implementation (versioned) and update register.  
   - Prepare rollback plan before any promotion.  
3) Promotion to production only after: governance lock, plan approval, UAT evidence, sign-off, and feature-flag review.  

## Extensions not yet integrated (all)
- EXT-01 … EXT-30 are not yet integrated.  
- Each requires: approved implementation plan, staging feature-flag enablement, UAT evidence pack with hashes, implementation lock on completion.

## Rules (must)
- Feature flags default OFF in production; staging-only enablement for testing.  
- UAT evidence required (screenshots/log refs + hashes) before any promotion.  
- No extension may bypass governance lock, plan lock, or implementation lock.  
- No code/config changes in this document; this is a planning artefact only.  

## Wave Assignment Lock
- Wave membership and order are frozen. Changes require formal change control and updated registry versioning.
