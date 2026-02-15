# GOVERNANCE MERGE AND PROTECTION RUNBOOK v1.0
Document ID: RRE-GOV-MERGE-PROTECTION-RUNBOOK-v1.0  
Version: v1.0  
Status: DRAFT  
Classification: Governance Operational Runbook  
Primary Series: 00 – Project Definition & Governance  
Authority Impact: Governance Infrastructure Institutionalization  
Runtime Authorization: NOT GRANTED BY THIS RUNBOOK

## 0) Execution Rule

- This runbook is executed in strict order.
- If any step fails its abort criteria, execution must stop and move to rollback handling.
- No runtime authority or RBAC changes are authorized by this runbook.

## 1) Preconditions (Hard Gates)

### 1.1 Mandatory Precondition Checklist

| Check | Verified By | UTC Timestamp | Evidence |
| --- | --- | --- | --- |
| Main working tree clean (`git status --porcelain` returns empty) | _TBD_ | _TBD_ | _TBD_ |
| No untracked governance files in target merge base | _TBD_ | _TBD_ | _TBD_ |
| Baseline tag exists and is pushed (`governance-dashboard-control-surface-v1.1-baseline`) | _TBD_ | _TBD_ | _TBD_ |
| Enforcement branch CI passes (`governance-control-surface-enforcement`) | _TBD_ | _TBD_ | _TBD_ |
| Weekly snapshot workflow validated via manual dispatch | _TBD_ | _TBD_ | _TBD_ |
| No open CRITICAL governance failures in platform status | _TBD_ | _TBD_ | _TBD_ |

### 1.2 Hard Stop Rule

If any row in Section 1.1 is incomplete or failing, STOP.

## 2) Merge Sequence (Deterministic Order)

### 2.1 Step 1 — Freeze merge window

Command:
```bash
gh api repos/<OWNER>/<REPO>/branches/main/protection > /tmp/main-protection.before.json
# Freeze mechanism (temporary hardening):
gh api \
  --method PATCH \
  /repos/<OWNER>/<REPO>/branches/main/protection/required_pull_request_reviews \
  -F dismiss_stale_reviews=true \
  -F require_code_owner_reviews=true \
  -F required_approving_review_count=6

# Verify freeze settings:
gh api /repos/<OWNER>/<REPO>/branches/main/protection/required_pull_request_reviews \
  --jq '{required_approving_review_count, require_code_owner_reviews, dismiss_stale_reviews}'
gh api repos/<OWNER>/<REPO>/branches/main/protection > /tmp/main-protection.freeze.json
```
Expected output:
- Protection snapshots captured before and during freeze window.
- Required approvals temporarily set to `6` with CODEOWNERS enforcement.
- Non-governance PRs are blocked by review threshold during freeze window.
- Temporary communication issued: "Governance merge window active."
Abort criteria:
- Unable to capture branch protection snapshots.
- Freeze settings do not match verification output.

### 2.2 Step 2 — Rebase governance branch on latest main

Commands:
```bash
git fetch origin --prune
git switch governance-activation-protocol-v1.0
git rebase origin/main
```
Expected output:
- Rebase completes with no unresolved conflicts.
Abort criteria:
- Unresolved conflict in governance artefacts.
- Any file outside governance/tooling scope changed by rebase conflict resolution.

### 2.3 Step 3 — Re-run governance enforcement locally

Command:
```bash
node tools/governance/enforcement/governance-scorecard-check.mjs
```
Expected output:
- Exit code `0`.
- `overall=PASS` in `artifacts/governance/dashboard-control-surface.scorecard.json`.
Abort criteria:
- Exit code non-zero.
- Any check reports `pass=false`.

### 2.4 Step 4 — Open pull request

Command (example):
```bash
gh pr create \
  --base main \
  --head governance-activation-protocol-v1.0 \
  --title "Governance: institutionalize enforcement + weekly snapshot" \
  --body "Merge governance meta-layer and enforcement tooling"
```
Expected output:
- PR created with CI checks pending.
Abort criteria:
- PR cannot be created.
- Required reviewers unavailable.

### 2.5 Step 5 — Verify required checks pass

Capture exact check names from GitHub UI/CLI before protection updates:
```bash
gh pr checks <PR_NUMBER> --json name --jq '.[].name'
```

Record exact strings in evidence and branch protection:
- governance enforcement check name (exact)
- build check name (exact)
- test check name (exact)

Expected output:
- Exact check names captured and match branch protection required checks.
- All required checks green.
Abort criteria:
- Any required check fails.
- Any captured check name does not exactly match branch protection required-check entry.

### 2.6 Step 6 — Merge policy

Merge mode policy (fixed):
- `squash` for linear-history compatibility and deterministic baseline tagging.

Command:
```bash
gh pr merge <PR_NUMBER> --squash --delete-branch=false
```
Expected output:
- PR merged to `main`.
Abort criteria:
- Merge blocked by failing checks.
- Merge mode conflicts with branch policy.

### 2.7 Step 7 — Tag post-merge baseline

Commands:
```bash
git fetch origin --prune
git switch main
git pull --ff-only origin main
git tag -a governance-operational-baseline-v1.0 -m "Governance operational baseline v1.0"
git push origin governance-operational-baseline-v1.0
```
Expected output:
- Tag exists locally and remotely.
Abort criteria:
- Tag push rejected.
- Tag resolves to commit not matching merged governance PR head.

### 2.8 Step 8 — Activation register update

State rule (deterministic):
- This runbook does **not** set `ACTIVATED`.
- After Sections 2, 3, and 4 all pass on `main`, append state `CI-VERIFIED`.
- `ACTIVATED` requires a separate board activation resolution per activation protocol.

Append row template:
```text
| <surfaceName> | CI-VERIFIED | <UTC> | N/A | <scorecardSha> | <manifestHash_or_N/A> | Governance Lead + CI/Platform Owner | <dmsRow> | Post-merge governance enforcement and protection checks verified on main. |
```

Expected output:
- One append-only row added with state `CI-VERIFIED`.
- `dmsRow` populated and evidence hashes referenced.

Abort criteria:
- Any in-place edit of existing rows.
- Attempt to set `ACTIVATED` without board resolution.
- Missing `dmsRow` or missing evidence hashes.

## 3) Protected Branch Configuration (Main)

### 3.1 Required settings

- Restore freeze approvals (`6`) back to steady-state approvals (`2`) in this step.
- Require pull request before merging: `ENABLED`
- Require approvals: `2`
- Require review from CODEOWNERS: `ENABLED`
- Require status checks to pass: `ENABLED`
- Require branches to be up to date before merging: `ENABLED`
- Dismiss stale approvals when new commits are pushed: `ENABLED`
- Require conversation resolution before merging: `ENABLED`
- Require linear history: `ENABLED`
- Allow force pushes: `DISABLED`
- Allow deletions: `DISABLED`
- Enforce admins: `ENABLED`

### 3.2 Required status checks

Use exact check run names captured in Section 2.5.

Minimum required checks (exact string values in branch protection):
- `<governance enforcement check name from PR checks output>`
- `<build check name from PR checks output>`
- `<test check name from PR checks output>`

Optional checks:
- `code-scanning`
- `snyk`

### 3.3 Evidence placeholders

- Branch protection configuration screenshot reference: `_TBD_`
- Required checks screenshot reference: `_TBD_`
- Policy export JSON reference: `_TBD_`

## 4) Weekly Snapshot Production Enablement

### 4.1 Enablement checklist

1. Confirm workflow file exists on `main`:
   - `.github/workflows/governance-weekly-snapshot.yml`
2. Confirm destination branch exists:
   - `governance-weekly-snapshots`
3. Confirm workflow permissions include:
   - `contents: write`
4. Run manual dispatch.
5. Confirm outputs:
   - Snapshot JSON created under `docs/governance/snapshots/`
   - Row appended in `docs/governance/GOVERNANCE_WEEKLY_SNAPSHOT_INDEX.md`
   - Artifacts uploaded in workflow run
   - Enforced PASS (or fail with evidence)

### 4.2 Verification table

| Item | Expected | Observed | Result |
| --- | --- | --- | --- |
| Workflow dispatch completes | Success status | _TBD_ | _TBD_ |
| Snapshot artifact created | `docs/governance/snapshots/governance-snapshot-*.json` | _TBD_ | _TBD_ |
| Index row appended | One new row only | _TBD_ | _TBD_ |
| Artifact upload present | Scorecard + snapshot meta + snapshot | _TBD_ | _TBD_ |
| Overall governance state | PASS | _TBD_ | _TBD_ |

## 5) Governance Baseline Declaration (Post-Merge)

After successful merge and protection rollout, create:
- `docs/governance/GOVERNANCE_BASELINE_DECLARATION_v1.0.md`

Mandatory declaration fields:
- Baseline tag (`governance-operational-baseline-v1.0`)
- Master Dashboard Control Surface version (`v1.1`)
- Activation Protocol version (`v1.0`)
- Enforcement job commit SHA
- Weekly snapshot workflow commit SHA
- Branch protection configuration hash/reference
- Current activation state (from activation register)
- UTC declaration timestamp

This declaration is the root-of-trust anchor for operational governance baseline.

## 6) Rollback Plan (Critical)

### 6.1 Scenario A — Enforcement blocks valid development

Trigger:
- False positive or governance policy mismatch causes sustained merge blockage.

Authorized by:
- Grand-Master + Governance Lead.

Actions:
1. Initiate temporary governance freeze (`FROZEN` state entry in activation register).
2. Open governance incident record with evidence.
3. Apply minimal policy correction in governance branch.
4. Re-run enforcement and close freeze only after PASS.

Revert anchor:
- Last known PASS commit/tag before freeze.

Register action:
- Append freeze row and recovery row with board/governance notes.

### 6.2 Scenario B — Weekly snapshot fails unexpectedly

Trigger:
- Scheduled workflow fails or outputs FAIL unexpectedly.

Authorized by:
- Governance Lead.

Actions:
1. Create governance incident.
2. Preserve failing artifacts.
3. Run manual snapshot dispatch for verification.
4. If repeated failure, enter temporary freeze and escalate.

Revert anchor:
- Last successful snapshot commit on `governance-weekly-snapshots`.

Register action:
- Append incident-linked note and any state transition.

### 6.3 Scenario C — Merge introduces drift

Trigger:
- Post-merge enforcement FAIL that was not present pre-merge.

Authorized by:
- Grand-Master + Platform Architect Council.

Actions:
1. Revert the merged governance change commit on `main` (squash commit in this runbook).
2. Retag baseline if required.
3. Re-run enforcement.
4. Re-open controlled PR with corrected artefacts.

Revert command pattern:
```bash
git revert <merge_commit_sha>
```

Register action:
- Append rollback event row with incident reference.

## 7) Post-Merge Monitoring Window

Duration:
- 14 days from governance merge date.

Rules during window:
- No structural governance model changes.
- No new required checks unless emergency approved.
- Weekly snapshot reviewed in governance cadence meeting.

Mandatory reviews:
- Day 7 review: stability and drift status.
- Day 14 review: closure and baseline confirmation.

## 8) Completion Criteria

Runbook execution is complete only when all are true:
1. Governance branch merged.
2. Required protection checks enforced.
3. Weekly snapshot automation active on dedicated branch.
4. Activation register updated append-only.
5. Baseline declaration created.
6. 14-day stabilization window entered.

## 9) Non-Authorization Clause

This runbook institutionalizes governance operations only.

It does not authorize:
- runtime RBAC expansion,
- endpoint activation outside approved governance process,
- bypass of Immutable Core constraints,
- activation state promotion without activation protocol evidence and ratification.
