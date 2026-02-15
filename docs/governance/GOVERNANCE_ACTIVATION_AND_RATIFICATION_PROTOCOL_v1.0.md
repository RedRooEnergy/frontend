# GOVERNANCE ACTIVATION AND RATIFICATION PROTOCOL v1.0
Document ID: RRE-GOV-ACTIVATION-RATIFICATION-PROTOCOL-v1.0  
Version: v1.0  
Status: DRAFT  
Classification: Meta-Governance Activation State Machine  
Primary Series: 00 – Project Definition & Governance  
Authority Impact: Board-Controlled Transition Framework  
Runtime Authorization: NOT GRANTED BY THIS DOCUMENT  
Change Control: REQUIRED

## 1) Purpose

Define one deterministic protocol for promoting any governed surface (dashboard, extension, or rule contract) through explicit governance states:
- `DRAFT`,
- `LOCK-READY`,
- `CI-VERIFIED`,
- `ACTIVATED`,
- `REGULATOR-READY`,
- `FROZEN`.

No surface may be treated as active by implication.

## 2) Scope

Applies to all governance-controlled surfaces under `docs/governance/` and `docs/extensions/` that affect:
- authority boundaries,
- mutation controls,
- CI governance gates,
- ratification status,
- regulator disclosures.

Excluded:
- direct runtime RBAC key changes,
- production authorization changes without separate activation resolution,
- any bypass of Immutable Core invariants.

## 3) Authority Classes

### 3.1 Advisory

Permitted actions:
- draft specifications,
- propose control mappings,
- prepare templates and non-operational artefacts.

Not permitted:
- state promotion beyond `DRAFT`.

### 3.2 Enforced

Permitted actions:
- implement static governance checks,
- enforce CI guards,
- publish scorecard/badge evidence.

Not permitted:
- authorize runtime activation.

### 3.3 Board-Controlled

Permitted actions:
- ratify transition to `ACTIVATED`,
- ratify transition to `REGULATOR-READY`,
- authorize emergency freeze and controlled reactivation.

Board-controlled transitions require DMS-registered hash artefacts.

## 4) Governance State Model

### 4.1 States

- `DRAFT`: design artefacts exist; no lock claim.
- `LOCK-READY`: artefacts complete for lock review; hash generation pending.
- `CI-VERIFIED`: required CI gates pass with hash-linked proof.
- `ACTIVATED`: board-approved operational activation under explicit scope.
- `REGULATOR-READY`: activation plus regulator transparency artefacts complete.
- `FROZEN`: emergency or governance freeze; mutation authority suspended per scope.

### 4.2 State Transition Rules

A transition is valid only when all required evidence in Section 5 exists and all approvals in Section 6 are complete.

Unauthorized transition attempts are governance violations and require incident logging.

## 5) Transition Prerequisites (Deterministic)

### 5.1 `DRAFT` -> `LOCK-READY`

Required:
1. Complete spec artefact set.
2. Scope and exclusions explicitly declared.
3. Non-authorization clause present.
4. Initial hash manifest template prepared.

Evidence required:
- commit reference,
- draft artefact paths,
- reviewer sign-off record.

### 5.2 `LOCK-READY` -> `CI-VERIFIED`

Required:
1. Hash manifest generated and verified.
2. DMS row appended with document and manifest hashes.
3. CI checks defined and passing.
4. Static route/authority drift checks passing where applicable.

Evidence required:
- CI run identifier,
- scorecard artefact hash,
- badge/status evidence hash,
- DMS row reference.

### 5.3 `CI-VERIFIED` -> `ACTIVATED`

Required:
1. Separate Board Activation Resolution approved.
2. Activation close pack generated and hashed.
3. Rollback controls and rehearsal evidence linked.
4. Feature flag and runtime guard posture verified.

Evidence required:
- board resolution ID,
- activation manifest hash,
- pre-activation audit report,
- rollback rehearsal record.

### 5.4 `ACTIVATED` -> `REGULATOR-READY`

Required:
1. Regulator transparency pack completed.
2. Cross-reference to activation evidence ladder.
3. External-facing control narrative approved by governance authority.
4. No unresolved CRITICAL governance failures.

Evidence required:
- transparency pack hash,
- disclosure index row reference,
- governance status snapshot hash.

### 5.5 `*` -> `FROZEN`

Permitted triggers:
- CRITICAL rule failure,
- ledger immutability violation,
- branch protection drift,
- unauthorized endpoint/authority expansion,
- unresolved evidence hash mismatch.

Required actions:
1. Freeze decision record.
2. Governance incident creation.
3. Impacted mutation surfaces disabled per freeze scope.
4. Remediation and re-verification plan filed.

## 6) Ratification Workflow

### 6.1 Required Approvals by Transition

| Transition | Minimum Approvals |
| --- | --- |
| `DRAFT` -> `LOCK-READY` | Governance Lead + Domain Lead |
| `LOCK-READY` -> `CI-VERIFIED` | Governance Lead + CI/Platform Owner |
| `CI-VERIFIED` -> `ACTIVATED` | Board Resolution (mandatory) |
| `ACTIVATED` -> `REGULATOR-READY` | Board or delegated authority + Regulator disclosure owner |
| `FROZEN` -> any non-frozen state | Board Resolution (mandatory) + remediation proof |

### 6.2 Ratification Artefact Requirements

Each ratified transition must include:
- resolution ID,
- effective UTC timestamp,
- linked commit hash,
- manifest hash,
- DMS row identifier,
- signatory block.

## 7) Rollback Protocol

### 7.1 Mandatory Rollback Triggers

- CI gate failure after activation.
- Static governance rule mismatch.
- Unauthorized permission surface exposure.
- Ledger immutability failure.
- Branch protection drift.

### 7.2 Rollback Requirements

1. Record rollback reason and incident ID.
2. Revert to last known valid governance baseline tag.
3. Regenerate governance status snapshot.
4. Update activation register to `FROZEN` or prior stable state.
5. Append DMS row for rollback event and artefact hashes.

## 8) Emergency Freeze Authority

Emergency freeze may be initiated by:
- Grand-Master,
- Platform Architect Council,
- Board-designated governance authority.

Freeze invocation must include:
- reason,
- scope,
- initiating authority,
- UTC timestamp,
- restoration preconditions.

Emergency freeze does not grant authority to bypass CI or Immutable Core controls.

## 9) Activation State Register (Mandatory)

Canonical file:
- `docs/governance/GOVERNANCE_ACTIVATION_REGISTER.md`

No surface is considered activated unless listed in the register.

Each register row must include:
- `surfaceName`,
- `state`,
- `stateEffectiveAtUTC`,
- `activatedAtCommit` (or `N/A` pre-activation),
- `ciArtefactHash`,
- `manifestHash`,
- `ratifiedBy`,
- `dmsRow`,
- `notes`.

## 10) Version Promotion Rules

- State promotions require immutable evidence and explicit approvals.
- Version increments must be monotonic and reflected in DMS.
- Superseded artefacts remain immutable and traceable.
- No in-place rewrite of previously ratified governance records.

## 11) Regulator-Ready Declaration Criteria

A surface may be declared `REGULATOR-READY` only when all are true:
1. Current state is `ACTIVATED`.
2. No CRITICAL governance check is `FAIL`.
3. Required transparency pack is published and hash-linked.
4. Evidence chain is complete from design lock to activation.
5. Register and DMS references are synchronized.

## 12) Non-Authorization Clause

This protocol defines state transitions and evidence requirements only.

It does not by itself authorize:
- runtime feature activation,
- role or permission expansion,
- endpoint exposure,
- bypass of Immutable Core constraints.

Runtime activation requires a separate board activation resolution and DMS-registered activation artefact set.
