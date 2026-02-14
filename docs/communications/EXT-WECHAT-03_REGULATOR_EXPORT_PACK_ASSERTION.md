# EXT-WECHAT-03 — Regulator Export Pack Assertion
Version: v1.0
Status: DESIGN ASSERTION (REGULATOR EXPORT)
Runtime Impact: NONE
Build Authorization: NOT GRANTED
Change Control: REQUIRED

## 1) Scope
Define a regulator-only, read-only export pack for WeChat evidence.

Pack name target:
- `wechat-regulator-export-pack-YYYYMMDDTHHMMSSZ.zip`

Required pack contents:
- `slice.json`
- `manifest.json`
- `manifest.sha256.txt`
- `README.txt`

## 2) Data Rules
Allowed evidence fields:
- masked identifiers
- body hash values
- body lengths
- statuses
- ISO 8601 timestamps
- paging/scope metadata

Forbidden evidence fields:
- raw message content
- raw payload bodies
- access tokens
- app secrets
- webhook secrets

## 3) Determinism Rules
JSON serialization requirements:
- stable field ordering via deterministic serializer
- deterministic array ordering

Deterministic ordering constraints:
- bindings: `createdAt` desc, then `bindingIdMasked` asc
- dispatches: `createdAt` desc, then `dispatchIdMasked` asc
- inbound: `receivedAt` desc, then `inboundIdMasked` asc

Volatile field handling:
- `generatedAt` may vary by request
- `canonicalHashSha256` must be computed over deterministic payload excluding volatile fields

## 4) Access Rules
Export endpoint requirements:
- GET only
- regulator role required
- extension-flag gated

Forbidden endpoint behavior:
- no mutation methods
- no send/retry/ack controls
- no ledger writes

## 5) Security and Governance Boundary
Export generation is derived-output only:
- no ledger mutation
- no domain-state mutation
- no unmasked identifier leakage

The export pack is evidentiary and non-authoritative for workflow state transitions.
