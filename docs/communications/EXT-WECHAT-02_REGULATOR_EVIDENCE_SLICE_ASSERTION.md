# EXT-WECHAT-02 — Regulator Evidence Slice Assertion
Version: v1.0
Status: DESIGN ASSERTION (REGULATOR READ-ONLY SLICE)
Runtime Impact: NONE
Build Authorization: NOT GRANTED
Change Control: REQUIRED

## 1) Scope
Regulator read-only view is limited to hash-first, masked projections from the master WeChat ledger.

Regulator may view:
- Binding records (masked)
- Dispatch records (hash-first)
- Dispatch status events
- Inbound message records (hash-first)

Regulator may NOT view:
- Raw message bodies
- Access tokens
- App secrets
- Internal IDs beyond deterministic hashes and masked references

## 2) Data Exposure Rules
All message content is represented as:
- SHA-256 body hash
- Body length only

All identifiers are masked:
- Last 4 visible only (prefix masked)

Time representation:
- ISO 8601 timestamps only

Mutation exposure:
- No mutation fields
- No action controls

## 3) Endpoint Classification and Access
Endpoint classification for regulator slice:
- GET only
- Extension flag gated
- Regulator role required

Forbidden endpoint behavior:
- No POST/PUT/PATCH/DELETE
- No dispatch/retry/send surfaces
- No mark-read or mark-processed mutation

## 4) Security and Governance Boundaries
Regulator slice remains:
- Hash-first
- Masked
- Read-only
- Non-authoritative for state mutation

Underlying ledgers remain authoritative and append-only:
- `wechat_channel_bindings`
- `wechat_dispatch_records`
- `wechat_dispatch_status_events`
- `wechat_inbound_message_records`

This assertion does not authorize runtime mutation changes.
