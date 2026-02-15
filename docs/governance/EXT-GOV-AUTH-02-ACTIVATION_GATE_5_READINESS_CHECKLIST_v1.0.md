# EXT-GOV-AUTH-02-ACTIVATION — Gate 5 Readiness Checklist

Document ID: RRE-GOV-AUTH-02-ACTIVATION-GATE-5-READINESS-CHECKLIST-v1.0  
Version: v1.0  
Status: DRAFT (Pre-Activation Governance Readiness)  
Classification: Governance Gate Evidence  
Runtime Activation: NOT AUTHORIZED  
Change Control: REQUIRED

## 1) Purpose

Define mandatory Gate 5 readiness checks before any activation proposal can be submitted for board consideration.

This checklist is a governance control artefact and does not authorize runtime activation.

## 2) Required Reference Artefacts

- Pre-Activation Audit Template:
  - `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_PRE_ACTIVATION_AUDIT_REPORT_TEMPLATE_v1.0.md`
- Mutation Surface Scan Artefact:
  - `frontend/tests/governance/authority/scanActivationMutationSurface.ts`
- CI Assertion Workflow:
  - `.github/workflows/governance-platform-aggregator.yml`
- Tranche 2 Closure Evidence:
  - `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_IMPLEMENTATION_TRANCHE_2_CLOSE_REPORT_v1.0.md`
  - `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_IMPLEMENTATION_TRANCHE_2_MANIFEST_v1.0.json`
- Activation Governance Rule Contract:
  - `docs/governance/GOV-AUTH-02-ACTIVATION_STATIC_RULE_CI_CONTRACT_v1.0.md`
- Rollout and Rollback Controls:
  - `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_ROLLOUT_ROLLBACK_CONTROLS_v1.0.md`
  - `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_ROLLBACK_REHEARSAL_RECORD_TEMPLATE_v1.0.md`

## 3) Gate 5 PASS Criteria

All items below must be `PASS`:

- [ ] Feature flag evidence captured (`ENABLE_EXT_GOV_AUTH_02_ACTIVATION_BUILD`).
- [ ] Runtime activation path remains hard-blocked (error code proof captured).
- [ ] `GOV-AUTH-02-ACTIVATION = PASS`.
- [ ] Platform governance overall = `PASS`.
- [ ] CI workflow run captured with required checks all passing.
- [ ] Mutation-surface scan run captured with `findings = 0`.
- [ ] Rollback rehearsal reference attached and outcome recorded.
- [ ] Non-expansion assertions complete:
  - [ ] no RBAC identifier changes
  - [ ] no permission surface expansion
  - [ ] no activation endpoints introduced
  - [ ] Immutable Core unchanged

## 4) Formal Sign-Off Roles

Mandatory sign-offs:

- Implementation Lead
- Governance Lead (Platform Architect Council delegate)
- Compliance Lead
- Security Reviewer

Optional:

- External Audit Observer (if regulator simulation is in progress)

## 5) Required Activation Resolution Identifier

Gate 5 completion does not activate runtime workflow.

Activation requires a separate board resolution ID:

- `RRE-BRD-RES-EXT-GOV-AUTH-02-ACTIVATION-RUNTIME-ACTIVATION-v1.0` (required future artefact)

No activation actions are authorized until this resolution exists, is signed, and is DMS/hash registered.

## 6) Rollback Command Reference

Rollback sequence reference is mandatory and must point to:

- `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_ROLLOUT_ROLLBACK_CONTROLS_v1.0.md`

Operational command references to capture in evidence:

- `git revert <activation-commit-sha>`
- `npx tsx tests/governance/authority/runGovAuth02ActivationBuildOnlyTests.ts`
- `npx tsx tests/governance/authority/runGovAuth02ActivationEngineBuildOnlyTests.ts`
- `npx tsx tests/governance/authority/scanActivationMutationSurface.ts`
- `npx tsx --eval \"import { getPlatformGovernanceStatus } from './app/api/governance/platform/_lib.ts'; console.log(JSON.stringify(getPlatformGovernanceStatus(), null, 2));\"`

## 7) Monitoring Window Requirements

Mandatory monitoring window before activation board submission:

- Window duration: minimum `7` consecutive days
- Required signals:
  - governance check stability (`GOV-AUTH-02-ACTIVATION` remains PASS)
  - no mutation-surface drift findings
  - CI required checks remain non-bypassable
  - no branch protection drift
- Evidence capture cadence:
  - daily status snapshot
  - daily CI run reference
  - end-window summary report

## 8) Gate 5 Determination Record

- Gate 5 status: `[PASS|FAIL]`
- Blocking issues (if FAIL): `[items]`
- Remediation owner(s): `[owner list]`
- Remediation due date (UTC): `[date]`
- Determination timestamp (UTC): `[timestamp]`

## 9) Non-Authorization Statement

This checklist is readiness evidence only.

It does not authorize:

- runtime activation,
- quorum enforcement in production,
- runtime RBAC or permission expansion,
- endpoint activation beyond build-only scope.
