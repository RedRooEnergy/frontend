# Wave 1 UAT Test Scripts (EXT-02, EXT-03, EXT-04, EXT-05)
Version: v1.0 (DRAFT — Testing Only)  
Scope: Staging with feature flags ON (NEXT_PUBLIC_EXT02/03/04/05=on); production flags remain OFF.

Common Preconditions
- Environment: Staging (non-prod banner visible).
- Flags: EXT-02/03/04/05 enabled; all others per baseline.
- Data: Non-sensitive test data only.
- Audit: Confirm audit events recorded for each action.

TC-02-01 EXT-02 Happy Path
- Steps: Open /extensions/wave1/ext02, enter title/description, submit.
- Expected: Success message; audit events EXT02_ACTION_INITIATED and EXT02_ACTION_COMPLETED.
- Evidence: Screenshot of form + message; audit log excerpt; hash reference.
- Forbidden check: With flag OFF, submit blocked; record screenshot/log.

TC-02-02 EXT-02 Validation
- Steps: Submit with missing fields.
- Expected: Validation message; no audit event for completion.
- Evidence: Screenshot/log.

TC-03-01 EXT-03 Happy Path
- Similar to TC-02-01 but for /extensions/wave1/ext03; audit EXT03_* events.

TC-03-02 EXT-03 Validation
- Missing fields → validation; no completion audit.

TC-04-01 EXT-04 Happy Path
- /extensions/wave1/ext04; audit EXT04_* events.

TC-04-02 EXT-04 Validation
- Missing fields → validation; no completion audit.

TC-05-01 EXT-05 Happy Path
- /extensions/wave1/ext05; audit EXT05_* events.

TC-05-02 EXT-05 Validation
- Missing fields → validation; no completion audit.

Rollback / Flag Checks
- Toggle each flag OFF → verify routes show disabled notice; no state writes; no audit completion events.
- Confirm banner reflects flag state.

Evidence Placeholders
- Screenshots: /evidence/wave1/<TC>/img-*.png
- Logs: /evidence/wave1/<TC>/log-*.txt
- Audit sample: last 5 relevant events (IDs only)
- Hash index: see report.

Status: v1.0 DRAFT — Testing Only.
