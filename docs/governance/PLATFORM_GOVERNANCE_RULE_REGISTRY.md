# Platform Governance Rule Registry

Version: v1.0
Status: LOCKED

## GOV-WECHAT-07

Extension: EXT-WECHAT-07  
Lifecycle Status: CLOSED  
Aggregator Rule: GOV-WECHAT-07  
Impact Class: Cryptographic Integrity  
Authority Expansion: NONE  
Mutation Rights Introduced: NONE

Pass Criteria:
- `GET /api/wechat/regulator-public-key` exists
- route is GET-only
- route is regulator-guarded
- route is extension-gated
- route is signature-gated
- explicit disabled-path 404 responses exist
- RSA-only key enforcement exists in public-key helper
- `REGULATOR-PUBLIC-KEY-GUARDS` invariant test block exists
- `docs/communications/EXT-WECHAT-07_CLOSE_PACK.md` exists

Failure Severity: CRITICAL

Scoring Policy:
- Binary PASS/FAIL only
- No partial credit
- On FAIL: platform badge state is `DEGRADED`
- On FAIL: cryptographic integrity pill is `RED`
- On FAIL: governance score deduction is `8%`

## GOV-CHAIN-01

Extension: EXT-CHAIN-INTEGRITY-01  
Lifecycle Status: IMPLEMENTATION AUTHORIZED (Activation Phase)  
Aggregator Rule: GOV-CHAIN-01  
Impact Class: Cross-Subsystem Cryptographic Integrity  
Authority Expansion: NONE  
Mutation Rights Introduced: NONE

Pass Criteria (static-only checks):
- `docs/communications/EXT-CHAIN-INTEGRITY-01_ASSERTION.md` exists
- `docs/communications/EXT-CHAIN-INTEGRITY-01_SCHEMA_DESIGN_PACK.md` exists
- `docs/communications/EXT-CHAIN-INTEGRITY-01_INVARIANT_TEST_SCAFFOLDING_SPEC.md` exists
- `docs/communications/EXT-CHAIN-INTEGRITY-01_CLOSE_PACK.md` exists
- `docs/communications/EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_AUTHORIZATION_PACKET.md` exists
- `docs/governance/BOARD_RESOLUTION_EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_AUTHORIZATION_v1.0.md` exists
- `frontend/lib/chainIntegrity/canonicalSettlement.ts` exists
- `frontend/lib/chainIntegrity/chainComputation.ts` exists
- `frontend/lib/chainIntegrity/verifyIntegrityChain.ts` exists
- `frontend/lib/chainIntegrity/writeOnceGuards.ts` exists
- `frontend/lib/chainIntegrity/exportManifestStore.ts` includes `EXPORT_MANIFEST_WRITE_ONCE_FIELDS`
- `frontend/lib/chainIntegrity/freightSettlementStore.ts` includes `FREIGHT_SETTLEMENT_WRITE_ONCE_FIELDS`
- `frontend/tests/chain-integrity/runChainIntegrityPhase1Tests.ts` exists
- `frontend/tests/chain-integrity/runChainIntegrityPhase2Tests.ts` exists

Failure Severity: CRITICAL

Scoring Policy:
- Binary PASS/FAIL only
- No partial credit
- On FAIL: platform badge state is `DEGRADED`
- On FAIL: cryptographic integrity pill is `RED`
- On FAIL: governance score deduction is `12%`

Activation Boundary:
- Static-analysis governance rule only.
- No runtime enforcement authorization is implied.
