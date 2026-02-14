# Platform Governance Index Summary

Version: v1.3.0  
Status: ACTIVE SUMMARY  
Classification: Governance Scoring Surface

## Current Index Controls

- Aggregator Endpoint: `/api/governance/platform/status`
- Badge Endpoint: `/api/governance/platform/badge`
- Rule Registry: `docs/governance/PLATFORM_GOVERNANCE_RULE_REGISTRY.md`

## EXT-WECHAT-07 Inclusion

Rule: `GOV-WECHAT-07`  
Impact Surface: Communications / Cryptographic Integrity  
Severity: CRITICAL  
Score Mode: Binary PASS/FAIL (no partial credit)

On FAIL:
- Platform badge state = `DEGRADED`
- Cryptographic integrity pill = `RED`
- Governance score deduction = `8%`

## Baseline References

- Aggregator and CI enforcement baseline: `9e2ab9a3e6f0cd808f535f6d5ec29fc6ebc3a982`
- Regulator addendum baseline: `c777b1a3808e48f95b0ca0156b89f0f126f52f0d`
- Board ratification reference: `docs/governance/BOARD_RESOLUTION_EXT-WECHAT-07_RATIFICATION_v1.0.md`

## EXT-CHAIN-INTEGRITY-01 Inclusion

Rule: `GOV-CHAIN-01`  
Impact Surface: Platform / IntegrityChain  
Severity: CRITICAL  
Score Mode: Binary PASS/FAIL (no partial credit)

On FAIL:
- Platform badge state = `DEGRADED`
- Cryptographic integrity pill = `RED`
- Governance score deduction = `12%`

## Baseline References (Chain Integrity)

- PGA and CI activation baseline: `b9823ce`
- Implementation close pack: `docs/communications/EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_CLOSE_PACK.md`
- Board ratification reference: `docs/governance/BOARD_RESOLUTION_EXT-CHAIN-INTEGRITY-01_RATIFICATION_v1.0.md`

## EXT-CHAT-01 / GOV-CHAT-01 Inclusion

Rule: `GOV-CHAT-01`  
Impact Surface: Platform / CommunicationIntegrity  
Severity: CRITICAL  
Score Mode: Binary PASS/FAIL (no partial credit)

On FAIL:
- Platform overall = `FAIL`
- Platform badge state = `DEGRADED`
- Platform PASS-3 governance declaration blocked

## Baseline References (Chat Governance Integration)

- Contract lock baseline: `184090f`
- Static rule baseline: `f4fe581`
- Badge/overall gating baseline: `791e72b`
- CI fail-gate baseline: `79f0e8f`
- EXT-CHAT-01 lock declaration: `docs/governance/BOARD_RESOLUTION_EXT-CHAT-01_LOCK_v1.0.md`

## Subsystem Completion Declaration — WeChat

WeChat domain (export signatures, regulator public key distribution,
cross-subsystem integrity linkage, and PGA enforcement) is marked COMPLETE.

Active and CI-enforced rules:
- `GOV-WECHAT-07`
- `GOV-CHAIN-01`

Completion declaration:
- `docs/governance/WECHAT_SUBSYSTEM_COMPLETION_DECLARATION_v1.0.md`

## Authority Statement

This index summary is a derived governance surface only.
It does not create operational authority and does not mutate subsystem state.

## Platform Governance Aggregator Baseline

Current governance baseline: `v1.3.0`  
Close Pack: `docs/governance/PLATFORM_GOVERNANCE_AGGREGATOR_CLOSE_PACK_v1.3.0.md`
