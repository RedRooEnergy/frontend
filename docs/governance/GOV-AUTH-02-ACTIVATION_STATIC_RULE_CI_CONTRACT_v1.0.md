# GOV-AUTH-02-ACTIVATION — Static Rule and CI Contract

Document ID: GOV-AUTH-02-ACTIVATION-STATIC-CONTRACT-v1.0  
Version: v1.0  
Status: AUTHORIZATION DESIGN LOCK (Static Contract Only)  
Classification: Governance Rule Contract  
Severity Class: CRITICAL (for future activation)  
Runtime Authorization: NOT GRANTED  
Change Control: REQUIRED

## 1) Contract Purpose

Define the static governance checks and CI contract required before `EXT-GOV-AUTH-02` runtime activation can be considered.

## 2) Rule Identity (Future Activation Target)

- Rule ID: `GOV-AUTH-02-ACTIVATION`
- Scope: Governance workflow activation readiness (design and control surfaces only)
- Mode: Binary PASS/FAIL
- Severity: CRITICAL

## 3) Static Input Sources

Required artefacts:
- `docs/extensions/EXT-GOV-AUTH-02-ACTIVATION/EXT-GOV-AUTH-02-ACTIVATION_AUTHORIZATION_SPEC_v1.0.md`
- `docs/governance/GOV-AUTH-02_MULTISIGNATURE_WORKFLOW_CONTRACT_v1.0.md`
- `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_ROLLOUT_ROLLBACK_CONTROLS_v1.0.md`
- `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_CLOSE_PACK_v1.0.md`
- `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_MANIFEST_v1.0.json`

## 4) PASS/FAIL Deterministic Criteria

PASS if all are true:
1. Activation authorization scope is present and non-operational.
2. Non-authorization clause for runtime privilege mutation is explicit.
3. Rollout gates and rollback controls are defined and deterministic.
4. Activation close pack references all required artefacts.
5. Manifest hashes validate against referenced files.

FAIL if any are true:
1. Missing required artefact.
2. Runtime activation implied without separate board authorization.
3. Rollback controls missing or non-deterministic.
4. Hash mismatch in activation manifest.
5. CI bypass language present.

## 5) CI Enforcement Contract (Future Phase)

When activated, CI must fail if `GOV-AUTH-02-ACTIVATION` evaluates FAIL.

This contract requires:
- required status check presence on `main`,
- CODEOWNERS review for governance paths,
- no admin bypass of failing governance checks.

## 6) Non-Coupling Clause

This contract may consume governance artefact state only.

It must not:
- mutate runtime workflow state,
- call operational approval endpoints,
- alter RBAC permissions,
- bypass Immutable Core controls.

## 7) Drift Conditions

Drift event (FAIL) if:
- any referenced activation artefact changes without DMS/hash update,
- rule semantics change without version increment,
- CI gate requirements change without change control reference.

## 8) Activation Boundary Statement

This is a static contract artifact only.

It does not authorize implementation or runtime activation by itself.
