# Platform Governance Index Summary

Version: v1.0  
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

## Authority Statement

This index summary is a derived governance surface only.
It does not create operational authority and does not mutate subsystem state.
