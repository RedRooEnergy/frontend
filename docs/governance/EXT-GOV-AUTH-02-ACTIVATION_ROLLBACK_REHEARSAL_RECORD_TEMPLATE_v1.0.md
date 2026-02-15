# EXT-GOV-AUTH-02-ACTIVATION — Rollback Rehearsal Record Template

Document ID: RRE-GOV-AUTH-02-ACTIVATION-ROLLBACK-REHEARSAL-TEMPLATE-v1.0  
Version: v1.0  
Status: TEMPLATE (Build-Phase Governance Evidence)  
Classification: Governance Control Evidence  
Runtime Authorization: NOT GRANTED

## 1) Rehearsal Metadata

- Rehearsal ID: `[ID]`
- Rehearsal Date (UTC): `[YYYY-MM-DDTHH:MM:SSZ]`
- Environment: `[LOCAL|STAGING|CI]`
- Extension ID: `EXT-GOV-AUTH-02-ACTIVATION`
- Governing Rule ID: `GOV-AUTH-02-ACTIVATION`
- Operator(s): `[name/handle]`
- Reviewer(s): `[name/handle]`

## 2) Baseline Anchors

- Authorization Manifest SHA-256: `ce44ce2891e50518e19c0d03a1800b186556c4a9cbc3862b977ed29218466517`
- Implementation Authorization Manifest SHA-256: `c6d02b96e78a05f28dcc3bcabbafe9bed06041de149807a1c996e3239ecb858c`
- Authority Lock Manifest SHA-256: `45edfccb03ae6642c95871e553f96c8d9990f754c42b53fa758c298809026e25`
- Target Commit SHA: `[commit-sha]`
- Feature Flag State: `ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD=[true|false]`

## 3) Trigger Condition Rehearsed

Select all that apply:

- [ ] CI gate failure
- [ ] Governance rule mismatch
- [ ] Ledger immutability violation
- [ ] Unauthorized permission surface exposure
- [ ] Branch protection drift

Trigger evidence reference(s): `[links/paths]`

## 4) Deterministic Rollback Sequence Evidence

Step 1: Disable activation-specific CI assertion (if applicable)  
Evidence: `[commit/command/log]`

Step 2: Revert activation rule to static/non-active mode  
Evidence: `[commit/command/log]`

Step 3: Revert implementation commits in reverse order  
Evidence: `[commit list]`

Step 4: Preserve immutable audit and evidence records  
Evidence: `[audit ids / artefact refs]`

Step 5: Record governance incident with commit references  
Evidence: `[incident id / report path]`

## 5) Integrity Verification

- Pre-rehearsal `GOV-AUTH-02-ACTIVATION` status: `[PASS|FAIL]`
- Post-rehearsal `GOV-AUTH-02-ACTIVATION` status: `[PASS|FAIL]`
- Pre-rehearsal platform overall: `[PASS|FAIL]`
- Post-rehearsal platform overall: `[PASS|FAIL]`
- Audit evidence deleted: `[NO]`
- Manifest anchor changed: `[NO]`
- Core RBAC identifiers changed: `[NO]`
- Runtime activation exposed: `[NO]`

## 6) Residual Risk and Actions

- Residual Risk Level: `[LOW|MED|HIGH]`
- Required Follow-Up Actions: `[items]`
- Target Dates (UTC): `[dates]`
- Owners: `[owners]`

## 7) Attestation

Implementation Lead: `[name/sign/date]`  
Governance Reviewer: `[name/sign/date]`  
Compliance Reviewer: `[name/sign/date]`

Attestation Statement:  
`This rehearsal was executed under build-only authorization boundaries. No runtime activation or authority expansion was introduced.`
