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
