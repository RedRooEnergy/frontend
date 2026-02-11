# Break-Glass Exception SOP (Emergency Governance Deviation)

Version: v1.0  
Status: ACTIVE  
Applies to: RedRooEnergy/frontend (main branch governance)

## 1. Purpose

This SOP defines the only permitted method to temporarily bypass or modify governance enforcement in an emergency, while preserving auditability and rapid restoration to baseline.

## 2. Definition of "Break-Glass"

A Break-Glass event is a time-bounded, documented deviation from governance enforcement required to:

- restore platform availability or critical functionality, or
- correct a release-blocking defect where immediate remediation cannot be completed within operational tolerance.

Break-Glass is not permitted for convenience, routine merges, or to bypass quality gates.

## 3. Preconditions (All Required)

Before any Break-Glass action is taken:

1) Create an issue titled:
   - BG-YYYYMMDD-<short-name> — Break-Glass Exception

2) The issue must include:
   - Incident summary (what is broken, impact)
   - Why normal merge process cannot be used
   - Exact change requested (branch protection setting or temporary override)
   - Start time (UTC) and maximum duration (hard stop)
   - Owner (single accountable person)
   - Rollback plan
   - Remediation plan (how audits will be restored to PASS)

3) Approval requirement (minimum):
   - Owner approval + one additional approver (or equivalent authority role)

## 4. Allowed Break-Glass Actions (Strictly Limited)

Allowed actions are limited to:

A) Temporarily disabling one required check  
B) Temporarily setting `enforce_admins = false` (when regulator-ready is active)  
C) Temporarily setting required_status_checks.strict = false  
D) Temporarily pausing conversation resolution requirement (only if it blocks urgent merge mechanics)

Not allowed:
- disabling all checks without explicit board-level instruction
- enabling force pushes
- disabling protections permanently
- merging unrelated changes during the exception window

## 5. Execution Steps (Operational)

1) Record the current branch protection JSON and attach it to the BG issue.
2) Apply the minimal protection change necessary.
3) Perform the emergency merge with a PR titled:
   - BG-YYYYMMDD-<short-name> — Emergency Merge
4) Immediately restore protection settings unless the SOP duration window is still active and necessary.

## 6. Maximum Duration

Default maximum duration: 4 hours  
Maximum duration without escalation: 24 hours

Any extension requires explicit approval recorded in the BG issue.

## 7. Post-Event Closure (Mandatory)

Within 48 hours of the Break-Glass event ending:

1) Restore full governance enforcement.
2) Run and record PASS results for all required audits.
3) Create a closure note in the BG issue:
   - What happened
   - What was changed
   - What was merged
   - Proof that governance is restored (links to runs/tags if applicable)
4) Open follow-up remediation issues to prevent recurrence.

## 8. Evidence Requirements

Every Break-Glass event must produce a minimal evidence pack:

- Link to the BG issue
- Link to PR(s)
- Branch protection "before" and "after" JSON
- Post-restoration audit PASS evidence

## 9. Non-Compliance

Any deviation from this SOP invalidates the Break-Glass event and triggers mandatory review.

Owner: ____________________  
Date (UTC): ____________________
