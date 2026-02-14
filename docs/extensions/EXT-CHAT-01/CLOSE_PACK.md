# EXT-CHAT-01 Close Pack
Version: v1.0
Status: LOCK-READY
Classification: Operational Chat Governance

## Scope Completed

- Marketplace-native operational chat subsystem only.
- Immutable chat records with append-only control events.
- Server-side RBAC and policy enforcement for thread/message lifecycle.
- Mutation controls: create thread, post message, escalate, lock, redact-by-event.
- Evidence export pack (JSON transcript + PDF + manifest + SHA-256 checksums).
- Role-scoped dashboard surfaces for buyer, supplier, admin.
- Polling-based realtime refresh (no WebSocket dependency in this phase).

## Non-Scope Confirmed

- No external chat platforms (WeChat/WhatsApp/etc).
- No message edit/delete operations.
- No client-only access control.
- No authority expansion beyond approved chat operations.

## Artefacts

### Governance
- `docs/extensions/EXT-CHAT-01/EXT-CHAT-01_SPEC.md`
- `docs/extensions/EXT-CHAT-01/ACCEPTANCE.md`
- `docs/extensions/EXT-CHAT-01/THREAT_MODEL.md`
- `docs/extensions/EXT-CHAT-01/CLOSE_PACK.md`

### Backend/Service
- `frontend/lib/chat/types.ts`
- `frontend/lib/chat/hash.ts`
- `frontend/lib/chat/auth.ts`
- `frontend/lib/chat/origin.ts`
- `frontend/lib/chat/rateLimit.ts`
- `frontend/lib/chat/policy.ts`
- `frontend/lib/chat/store.ts`
- `frontend/lib/chat/ChatService.ts`
- `frontend/lib/chat/ChatAttachmentService.ts`
- `frontend/lib/chat/ChatAutomationRules.ts`
- `frontend/lib/chat/ChatExportService.ts`

### API
- `frontend/app/api/chat/threads/route.ts`
- `frontend/app/api/chat/threads/[threadId]/route.ts`
- `frontend/app/api/chat/threads/[threadId]/messages/route.ts`
- `frontend/app/api/chat/threads/[threadId]/escalate/route.ts`
- `frontend/app/api/chat/threads/[threadId]/lock/route.ts`
- `frontend/app/api/chat/threads/[threadId]/redact/route.ts`
- `frontend/app/api/chat/threads/[threadId]/export/route.ts`
- `frontend/app/api/chat/attachments/route.ts`
- `frontend/app/api/chat/attachments/upload/route.ts`

### Frontend
- `frontend/components/chat/ChatThreadList.tsx`
- `frontend/components/chat/ChatWindow.tsx`
- `frontend/components/chat/ChatMessageBubble.tsx`
- `frontend/components/chat/AttachmentPicker.tsx`
- `frontend/components/chat/EscalationBanner.tsx`
- `frontend/components/chat/SLAIndicator.tsx`
- `frontend/components/chat/ChatDashboardClient.tsx`
- `frontend/app/dashboard/buyer/messages/page.tsx`
- `frontend/app/dashboard/supplier/messages/page.tsx`
- `frontend/app/dashboard/admin/conversations/page.tsx`

### Governance CI and Scorecard
- `frontend/tests/chatbot/runChatbotTests.ts`
- `.github/workflows/chatbot-audit.yml`
- `scorecards/chatbot.scorecard.json`
- `frontend/app/api/governance/chatbot/status/route.ts`
- `frontend/app/api/governance/chatbot/badge/route.ts`

## PASS Gate Summary

### PASS-1
- Data model/indexes implemented in chat store collections.
- RBAC policy engine present and enforced via service + routes.
- Create/send audit control events emitted.

### PASS-2
- Buyer/supplier/admin chat pages implemented.
- Attachment upload flow with type + size enforcement.
- Polling-based realtime updates implemented.

### PASS-3
- Automation/escalation rule hooks implemented.
- Deterministic evidence export pack implemented.
- Governance scorecard + CI gate + badge/status surfaces implemented.

## Security Controls

- Origin validation for mutating routes.
- Authentication required on all chat endpoints.
- Payload allow-list and unknown-field rejection in service/routes.
- Message size limits and attachment size/type limits.
- Per-user per-thread rate limiting on message send.

## Final Declaration

EXT-CHAT-01 is implemented as an operational chat subsystem with immutable record semantics, server-side RBAC, evidence exportability, and governance test gates.
