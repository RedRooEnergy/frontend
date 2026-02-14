# EXT-WECHAT-01 — Master Ledger Assertion
Version: v1.0
Status: DESIGN ASSERTION (EVIDENCE LEDGER)
Runtime Impact: NONE
Change Control: REQUIRED

## 1) Binding Scope
WeChat channel binding requirements:

- Supplier binding: required for supplier-channel operation
- Admin binding: required for admin-channel operation
- Buyer binding: optional but supported when buyer channel usage is enabled

## 2) Mandatory Evidence Records
All governed WeChat evidence must be recorded in the master WeChat ledger collections:

- `wechat_channel_bindings`
- `wechat_dispatch_records`
- `wechat_dispatch_status_events`
- `wechat_inbound_message_records`

No alternative or shadow communication ledger is permitted.

## 3) Retention and Immutability
Operational WeChat evidence retention class is `7Y`.

Ledger behavior is append-only:

- no edits of historical evidence
- no deletes of historical evidence
- status progression recorded by append-only events

## 4) Domain-State Isolation
Inbound WeChat content is evidence-bearing only.

Inbound message content must not directly mutate:

- orders
- payments
- freight
- compliance
- governance state

State transitions remain platform-authoritative through authenticated workflow routes only.

## 5) Regulator Exposure Boundary
Regulator-facing slices remain masked and hash-first.

- no raw bodies by default
- no secret/token disclosure
- deterministic hash references preserved
