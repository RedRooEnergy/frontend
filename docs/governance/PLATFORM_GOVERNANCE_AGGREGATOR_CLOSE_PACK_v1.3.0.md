# Platform Governance Aggregator Close Pack

Document ID: RRE-PGA-CLOSE-PACK-v1.3.0  
Version: v1.3.0  
Status: LOCK-READY  
Classification: Internal Governance / Aggregator Baseline Closure  
Effective Date: 2026-02-14  
Authority: Governance Office — RedRooEnergy  
Change Control: Required for amendment

## 1. Scope

This close pack records the governance baseline upgrade of the Platform Governance Aggregator (PGA) to include `GOV-CHAT-01` as an active CRITICAL rule with static evaluation and CI fail-gate enforcement.

This upgrade changes governance scoring/control surfaces only.

No chat runtime authority, mutation surface, or operational flow was modified.

## 2. Baseline Upgrade

Previous baseline: `v1.2.0` (WeChat + Chain governance controls active)  
Upgraded baseline: `v1.3.0` (WeChat + Chain + Chat governance controls active)

## 3. Included Rule Set (Active)

- `GOV-WECHAT-07` — Communications / Cryptographic Integrity
- `GOV-CHAIN-01` — Cross-Subsystem Integrity Chain
- `GOV-CHAT-01` — Operational Chat Governance Integrity

All three rules are binary `PASS/FAIL` with `CRITICAL` severity posture.

## 4. Commit Evidence Chain

- `184090f` — Lock `GOV-CHAT-01` rule contract (`docs/governance/GOV-CHAT-01_PGA_RULE_CONTRACT.md`)
- `f4fe581` — Static PGA implementation of `GOV-CHAT-01`
- `791e72b` — Badge/overall gating integration for `GOV-CHAT-01`
- `79f0e8f` — Platform governance CI fail-gate for `GOV-CHAT-01`

Supporting EXT-CHAT-01 governance baseline:
- `41d161d` — Board lock declaration for EXT-CHAT-01
- `5323206` — EXT-CHAT-01 governance closure + scorecard + CI gate

## 5. Rule Contract Reference

`GOV-CHAT-01` contract: `docs/governance/GOV-CHAT-01_PGA_RULE_CONTRACT.md`

Contract highlights:
- Input source: `/api/governance/chatbot/status`
- Scorecard artefact: `scorecards/chatbot.scorecard.json`
- Failure conditions include missing scorecard, scorecard FAIL, badge mismatch, malformed status payload, CI bypass attempt
- Non-coupling clause enforced: aggregator consumes governance state only; no reverse dependency and no chat-state mutation allowed

## 6. CI Enforcement

Platform governance CI workflow enforces `PASS` on:
- `GOV-WECHAT-07`
- `GOV-CHAIN-01`
- `GOV-CHAT-01`

Workflow file:
- `.github/workflows/governance-platform-aggregator.yml`

## 7. Authority and Boundary Statement

This baseline upgrade does NOT authorize:
- chat runtime mutation changes,
- chat route expansion,
- authority escalation in chat roles,
- bypass of existing EXT-CHAT-01 controls,
- operational coupling from aggregator to chat state.

This is governance-surface integration only.

## 8. Final Declaration

Platform Governance Aggregator baseline `v1.3.0` is declared complete and lock-ready at commit:

`79f0e8f`

Any modification to rule semantics, severity, weighting posture, CI gating behavior, or badge degradation logic requires formal change control and board amendment.
