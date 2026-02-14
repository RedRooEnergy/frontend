# EXT-CHAT-01 Acceptance Gates

Version: v1.0
Status: ACTIVE

## PASS-1 (Storage + RBAC)

Required:
- ChatThread/ChatMessage (+ attachments/redaction events) collections with indexes
- Server policy engine with unit matrix tests
- REST routes for create/list/detail/post/escalate/lock/redact/export
- No message edit/delete routes
- Audit event append on create/send/escalate/lock/redact/export

Pass criteria:
- Non-participants cannot read/post threads
- Locked thread rejects new messages
- Validation rejects unknown fields
- Message size limit enforced

## PASS-2 (Delivery + UI + Attachments)

Required:
- Buyer/Supplier/Admin pages
- Thread list + thread window + composer + lock/escalation states
- Attachment upload endpoint with type and size controls
- Polling or WebSocket delivery path with auth + limit controls

Pass criteria:
- Buyer and supplier view only authorized threads
- Admin can lock thread and UI composer disables
- Attachments hash and metadata persisted in message snapshot

## PASS-3 (Automation + Export + Governance Closure)

Required:
- Keyword automation rules -> case linkage hooks
- Deterministic transcript evidence export (PDF + manifest + hash)
- Admin monitor/audit view
- CI checks and scorecard/badge integration
- Extension close pack document

Pass criteria:
- Escalation writes system event with case link
- Export hash stable for same dataset
- Governance CI fails on prohibited mutation drift
