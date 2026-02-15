# BOARD RESOLUTION — EXT-GOV-AUTH-02-ACTIVATION Implementation Authorization

Document ID: RRE-BRD-RES-EXT-GOV-AUTH-02-ACTIVATION-IMPLEMENTATION-v1.0  
Version: v1.0  
Status: LOCK-READY  
Classification: Internal Governance / Board Authorization  
Effective Date: 2026-02-15  
Authority: Board of Directors — RedRooEnergy  
Change Control: Required for amendment

## 1. Resolution Scope

This resolution authorizes bounded build-phase implementation work for `EXT-GOV-AUTH-02-ACTIVATION` under governance controls.

Referenced artefacts:
- `docs/extensions/EXT-GOV-AUTH-02-ACTIVATION/EXT-GOV-AUTH-02-ACTIVATION_AUTHORIZATION_SPEC_v1.0.md`
- `docs/governance/GOV-AUTH-02-ACTIVATION_STATIC_RULE_CI_CONTRACT_v1.0.md`
- `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_ROLLOUT_ROLLBACK_CONTROLS_v1.0.md`
- `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_CLOSE_PACK_v1.0.md`
- `docs/governance/EXT-GOV-AUTH-02-ACTIVATION_MANIFEST_v1.0.json`
- `docs/governance/BOARD_RESOLUTION_EXT-GOV-AUTH-02_DESIGN_ENDORSEMENT_v1.0.md`

## 2. Bounded Implementation Scope (Authorized)

The Board authorizes build-phase development only for:
- schema and data-model design for governance workflow support,
- workflow engine scaffolding in disabled or feature-flagged state,
- immutable audit coupling and ledger wiring,
- CI integration hooks for governance validation,
- static-rule contract integration support.

This authorization is strictly non-operational.

## 3. Explicit Non-Authorized Surfaces

This resolution does not authorize:
- activation of approval workflow in production,
- quorum enforcement against live governance decisions,
- mutation of existing authority roles,
- override of branch protection or CI gates,
- privilege escalation pathways,
- runtime endpoint exposure beyond feature-flagged or disabled state,
- runtime RBAC expansion or Core-boundary modification.

## 4. Sequencing Gates (Mandatory)

Progression is authorized only in the following order:

Gate 1: Implementation build complete in isolated commits, feature-flagged/disabled, with tests authored.  
Gate 2: Static rule PASS under `GOV-AUTH-02-ACTIVATION`.  
Gate 3: CI enforcement validated.  
Gate 4: Rollback rehearsal documented.  
Gate 5: Pre-activation audit report generated.  
Gate 6: Separate Board Activation Resolution approved before any activation action.

Step skipping is prohibited.

## 5. Rollback Conditions (Mandatory)

Rollback controls must execute immediately upon:
- CI gate failure,
- ledger immutability violation,
- unauthorized permission surface exposure,
- branch protection drift,
- governance rule mismatch.

Rollback execution must preserve immutable evidence and audit records.

## 6. Mandatory Re-Ratification Clause

Any activation action requires all of the following:
- new Board Activation Resolution,
- new activation close pack and manifest,
- DMS hash index row update,
- updated regulator transparency addendum.

No activation is permitted under this implementation authorization resolution alone.

## 7. Core Preservation and Non-Expansion

The Board confirms:
- Immutable Core constraints remain non-bypassable,
- existing runtime RBAC boundaries remain unchanged,
- this authorization grants no operational authority expansion.

## 8. Ratification Statement

The Board approves bounded implementation authorization for `EXT-GOV-AUTH-02-ACTIVATION` under the constraints in this resolution.

Runtime activation remains deferred and not authorized.

## 9. Signature Block

Board Chair (or delegate): ____________________  
CTO / Engineering Authority: ____________________  
Compliance Lead: ____________________  
Date (UTC): ____________________
