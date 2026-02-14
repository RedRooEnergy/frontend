# EXT-WECHAT-04 — Regulator Export Request Audit Log Assertion
Version: v1.0
Status: DESIGN + IMPLEMENTATION AUTHORIZATION (READ-ONLY APPEND AUDIT)
Authority Impact: NONE
Mutation Rights: NONE (audit append-only)
Change Control: REQUIRED for boundary expansion

## Purpose
Define an append-only chain-of-custody ledger for regulator export requests under `/api/wechat/regulator-export-pack`.

This extension records who exported what, when, scope, format, and hash attestations without changing export pack contents or read-only evidence semantics.

## Scope
In scope:
- Append-only export event records in `wechat_regulator_export_audit_log`.
- Read-only regulator viewing of export audit events.
- GET-only route surfaces.

Out of scope:
- Any mutation to WeChat domain ledgers.
- Export pack format changes.
- Rate limiting and throttling (handled by EXT-WECHAT-05).

## Ledger Contract
Collection: `wechat_regulator_export_audit_log`
Retention: `7Y`
Write mode: append-only (`insert` only)
Updates/deletes: prohibited

Required fields:
- `eventId` (deterministic ID or UUID)
- `actorId` (regulator actor)
- `actorRole` = `regulator`
- `requestedAt` (ISO 8601 UTC)
- `format` = `zip | json`
- `scope` = `{ bindingId: string | null, limit: number, page: number }`
- `manifestSha256` (sha256 of manifest.json for generated pack)
- `canonicalHashSha256` (from pack manifest)
- `route` (string path)

Optional client metadata:
- `client.ipHash`
- `client.userAgentHash`

## Exposure Rules
Must not store or expose:
- raw message bodies
- access tokens
- app secrets
- webhook secrets
- unmasked sensitive identifiers

Route posture:
- regulator role required
- extension flag required
- GET-only on audit viewer surfaces

## Chain-of-Custody Guarantee
Every successful regulator export response (zip or json format) must append exactly one audit record before response emission. Unlogged exports are not permitted.
