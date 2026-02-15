# EXT-GOV-AUTH-02-ACTIVATION — Rollout Gating and Rollback Controls

Document ID: RRE-GOV-AUTH-02-ACTIVATION-ROLLOUT-ROLLBACK-v1.0  
Version: v1.0  
Status: AUTHORIZATION DESIGN LOCK  
Classification: Governance Control Procedure  
Runtime Authorization: NOT GRANTED  
Change Control: REQUIRED

## 1) Purpose

Define deterministic rollout gates and rollback controls for future `EXT-GOV-AUTH-02-ACTIVATION` implementation.

This document is procedural and non-operational in current tranche.

## 2) Rollout Gates (Future Implementation Phase)

Gate A — Governance Preconditions
- activation authorization spec locked,
- static rule/CI contract locked,
- activation close pack + manifest locked,
- DMS row present and hash-verified.

Gate B — Implementation Authorization
- board implementation authorization resolution approved,
- implementation scope explicitly bounded,
- no runtime privilege expansion approved.

Gate C — Controlled Build
- feature implemented in isolated commits,
- immutable audit coupling verified,
- no RBAC drift confirmed by tests.

Gate D — Governance Activation
- static rule passes,
- CI gate passes,
- badge/state behavior verified.

Gate E — Ratification and Closure
- implementation close pack finalized,
- board ratification recorded,
- DMS/hash updates complete.

## 3) Rollback Triggers

Rollback is mandatory on:
- CI gate failure post-activation,
- governance rule evaluation inconsistency,
- approval ledger immutability breach,
- unauthorized endpoint or permission surface introduced.

## 4) Rollback Order (Deterministic)

1. Disable activation-specific CI gate only.
2. Revert activation rule to static/non-active mode.
3. Revert implementation commits in reverse order.
4. Preserve immutable audit/evidence records.
5. Record governance incident with reason and commit references.

No rollback step may delete immutable evidence.

## 5) Prohibited Rollback Actions

- no force rewrite of audit records,
- no branch protection bypass,
- no silent reconfiguration without DMS/hash update,
- no RBAC role-key rewrites.

## 6) Evidence Requirements

Every rollout/rollback stage must capture:
- commit SHA set,
- UTC timestamps,
- governance rule outputs,
- CI status snapshot,
- incident/audit reference IDs.

## 7) Non-Authorization Clause

This control document does not authorize runtime rollout.

It defines required controls for a future board-approved implementation phase only.
