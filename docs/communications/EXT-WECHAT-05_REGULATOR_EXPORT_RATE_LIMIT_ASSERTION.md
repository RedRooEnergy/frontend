# EXT-WECHAT-05 — Regulator Export Rate Limit Assertion
Version: v1.0
Status: IMPLEMENTATION AUTHORIZED
Authority Impact: NONE
Mutation Rights: NONE
Change Control: REQUIRED for boundary expansion

## Purpose
Apply regulator-scoped rate limiting to `/api/wechat/regulator-export-pack` using append-only audit ledger evidence from `wechat_regulator_export_audit_log`.

This extension controls operational export frequency without changing export-pack contents or read-only evidence semantics.

## Scope
In scope:
- Regulator-scoped export throttling for `format=zip|json`.
- Ledger-backed counting using `requestedAt` windows.
- GET-only route behavior preserved.

Out of scope:
- Any mutation of WeChat domain ledgers.
- Any change to ZIP pack contract.
- Any change to regulator slice masking/hash-first doctrine.

## Enforcement Model
Rate-limit decision source:
- `wechat_regulator_export_audit_log`

Evaluation tuple:
- `actorId`
- `route`
- `requestedAt >= windowStart`

Decision:
- If count in window `>= maxRequests`: return `429`.
- If count in window `< maxRequests`: continue export flow.

Recommended response metadata:
- `Retry-After`
- `X-WeChat-Export-RateLimit-Limit`
- `X-WeChat-Export-RateLimit-Remaining`
- `X-WeChat-Export-RateLimit-Window`

## Configuration Contract
Environment controls:
- `WECHAT_EXPORT_RATE_LIMIT_ENABLED` (default: true)
- `WECHAT_EXPORT_RATE_LIMIT_MAX_REQUESTS` (default bounded integer)
- `WECHAT_EXPORT_RATE_LIMIT_WINDOW_SECONDS` (default bounded integer)

Config parsing must be deterministic and bounded.

## Chain-of-Custody Compatibility
EXT-WECHAT-04 remains authoritative for export-event attestation.

Rate limiting must not bypass or weaken EXT-WECHAT-04 guarantees:
- successful exports remain append-audited
- unlogged exports remain prohibited

## Security / Exposure Rules
Prohibited:
- raw body exposure
- secret/token exposure
- non-GET export surfaces
- mutable unified stores

Rate-limiting must not expose sensitive client metadata values.

## Failure Posture
If rate-limit evaluation cannot be performed safely, return an explicit server error and do not emit export content.

## Acceptance Criteria
PASS:
- export route remains GET-only
- regulator export requests are throttled per actor/window
- 429 response includes retry guidance
- export pack contract unchanged
- EXT-WECHAT-04 append-only audit path remains intact

FAIL:
- rate limiting introduces mutation surfaces
- export response contract is altered
- audit append is bypassed on successful export
