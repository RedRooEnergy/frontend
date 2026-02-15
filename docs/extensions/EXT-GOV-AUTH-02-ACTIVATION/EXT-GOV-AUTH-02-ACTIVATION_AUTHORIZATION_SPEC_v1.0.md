# EXT-GOV-AUTH-02-ACTIVATION — Implementation Authorization Specification

Document ID: EXT-GOV-AUTH-02-ACTIVATION-AUTH-SPEC-v1.0  
Version: v1.0  
Status: AUTHORIZATION DESIGN LOCK (Docs-First)  
Classification: Governance / Activation Authorization  
Authority Impact: NONE (no runtime grant in this document)  
Runtime Authorization: NOT GRANTED  
Change Control: REQUIRED

## 1) Purpose

Define the bounded authorization specification required to progress `EXT-GOV-AUTH-02` from design-endorsed doctrine to implementation-eligible planning without activating runtime workflow.

## 2) Dependency Anchors

This specification is anchored to:
- `EXT-GOV-AUTH-01` authority baseline (production locked),
- `EXT-GOV-AUTH-02` design-lock + board design endorsement,
- active repository governance enforcement (branch protections + CODEOWNERS + CI).

Required references:
- `docs/governance/PLATFORM_DESIGN_AUTHORITY_LOCK_MANIFEST_v1.0.json`
- `docs/governance/EXT-GOV-AUTH-02_DESIGN_LOCK_MANIFEST_v1.0.json`
- `docs/governance/BOARD_RESOLUTION_EXT-GOV-AUTH-02_DESIGN_ENDORSEMENT_v1.0.md`

## 3) Authorized Scope (Planning Only)

In scope for this activation spec:
- implementation authorization boundaries,
- static rule/CI contract definition,
- rollout gating and rollback controls,
- close-pack documentation and DMS registration requirements.

Out of scope:
- runtime approval engine activation,
- API endpoint activation,
- RBAC/permission changes,
- operational workflow execution.

## 4) Activation Sequence Contract

Sequence must occur in order:
1. Authorization specification lock (this document)
2. Static governance rule + CI contract lock
3. Rollout gating + rollback controls lock
4. Activation close pack + manifest + DMS registration
5. Board implementation authorization resolution (future, separate)
6. Implementation phase (future, separate)

Step-skipping is prohibited.

## 5) Implementation Preconditions (Future Phase)

Before any runtime implementation can be authorized:
- board implementation authorization resolution must exist,
- static governance rule must be defined with deterministic PASS/FAIL criteria,
- CI gate contract must be approved,
- rollback controls must be approved,
- change-control record must reference this activation pack.

## 6) Explicit Non-Authorized Surfaces

This specification does not authorize:
- creation of runtime mutation endpoints,
- quorum decision execution in production,
- override of branch protection or CI requirements,
- bypass of immutable audit requirements,
- any operational privilege escalation.

## 7) Acceptance Criteria (Authorization Design Lock)

PASS when:
- activation scope is explicit and bounded,
- runtime non-authorization is explicit,
- sequencing contract is explicit,
- static rule/CI contract is referenced,
- rollout/rollback controls are referenced.

FAIL when:
- runtime activation is implied,
- authorization scope is ambiguous,
- rollback posture is undefined,
- CI/static checks are not defined.

## 8) Activation Deferral Integrity

`EXT-GOV-AUTH-02-ACTIVATION` in this tranche is documentation-only.

Runtime authorization remains deferred until a future board-approved implementation authorization packet is ratified.
