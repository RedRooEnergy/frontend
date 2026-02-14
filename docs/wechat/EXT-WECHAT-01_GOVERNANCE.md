# EXT-WECHAT-01 Governance Charter
Version: v1.0
Status: LOCKED BASELINE

## BASELINE LOCK NOTICE
As of February 14, 2026, EXT-WECHAT-01 is locked.
Any structural modification requires formal change control.

## 1) Purpose
Implement WeChat as a governed external communications channel for cross-border supplier operations.

WeChat is a channel integration only:
- Event-driven
- Template-locked
- Deterministically rendered
- Audit- and hash-bearing

Operational authority remains in RRE platform state transitions.

## 2) Non-Negotiable Boundaries
- No embedded WeChat live chat UI in RRE.
- No scraping/proxying personal WeChat chats.
- No free-form admin message endpoint.
- No regulator auto-send messaging.
- No platform state transition from untrusted WeChat text.

## 3) Canonical Data Objects
- `WeChatChannelBinding` (mutable with append-only audit trail)
- `WeChatTemplateRegistry` (governance locked in production)
- `WeChatDispatchRecord` (immutable dispatch evidence)
- `WeChatDispatchStatusEvent` (append-only status transitions)
- `WeChatInboundMessageRecord` (immutable inbound capture)
- `WeChatAuditAttestation` (governance audit artefact)

## 4) Immutability Rules
- Dispatch payload is immutable after creation.
- Provider status progression is append-only via `WeChatDispatchStatusEvent`.
- Inbound messages are append-only.
- Binding lifecycle changes require audit entry append.

## 5) Determinism Rules
- Renderer uses deterministic placeholder substitution.
- Stable key ordering for hashes.
- Dispatch idempotency key is deterministic by eventCode + recipientBinding + correlation + payload hash + window bucket.
- Template contract hash is SHA-256 over canonical contract JSON.

## 6) Security and Data Minimization
- Allowed links restricted to approved hosts/patterns.
- Secret/bank/card/token pattern rejection in renderer policy validator.
- Provider response redaction for token/secret/signature fields.
- No credentials or payment instruments in message body.

## 7) Retention & Evidence
Default retention class for operational/compliance/freight/payment/account messages is `7Y`.

Minimum evidence per dispatch:
- `eventCode`
- correlation references (`orderId` / `shipmentId` / `paymentId` / `complianceCaseId`)
- rendered payload hash
- template contract hash
- provider status events

## 8) Role and Authority
- Supplier: start/view binding status only.
- Admin: list dispatches, view dispatch detail, retry failed dispatch, suspend/revoke bindings.
- Regulator: read-only governance overview and hashes.
- Platform service: dispatch execution only from approved event codes.

## 9) Compliance Statement
WeChat is not a system of record for operational outcomes.

All authoritative outcomes are recorded inside RRE (orders, compliance, freight, payments) with RBAC and immutable logs.
