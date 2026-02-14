# EXT-CHAT-01 - RRE Operational Chat Subsystem Specification

Version: v1.0
Status: BUILD AUTHORIZED (PASS-1/2/3)
Classification: Marketplace-Native Operational Chat
Authority Impact: NONE
Mutation Scope: Thread lifecycle + append-only chat records + audited moderation events only

## 1) Scope

EXT-CHAT-01 provides marketplace-native operational chat for RRE users and roles:
- buyer
- supplier
- admin
- regulator (read-only subset)
- freight/compliance roles (role-linked threads only)

This subsystem is record-bearing communication, not social chat.
Every material action is auditable and replayable.

## 2) Explicit Exclusions

- No WeChat integration
- No WhatsApp integration
- No external chat SDK or iframe messaging surfaces
- No marketing bot or campaign bot behavior
- No message edit/delete mutation
- No client-only access control decisions

Allowed post-send controls:
- redact-by-event (append-only redaction event)
- lock thread
- escalate thread

## 3) Data Doctrine

- Messages are immutable append-only records
- Redaction is represented as a new event, not body rewrite
- Thread state transitions are auditable events
- Export packs are deterministic and hash-verifiable

## 4) RBAC Matrix (Server-Enforced)

- Buyer:
  - create: PRODUCT_INQUIRY, ORDER (owned entities only)
  - read/post: participant threads only
  - no lock/escalate/export authority
- Supplier:
  - read/post: participant threads only
  - no lock authority
  - escalate permitted where policy allows
- Admin:
  - read all
  - lock all
  - escalate all
  - redact all
  - export all
- Regulator:
  - read-only for escalated/flagged or explicit allow-list threads
  - no post/lock/escalate/redact
- Freight/Compliance roles:
  - read/post only where role assignment matches related entity/case

All decisions are server-side policy outcomes.

## 5) Core API Surface

Required routes:
- POST /api/chat/threads
- GET /api/chat/threads?scope=mine
- GET /api/chat/threads/:id
- POST /api/chat/threads/:id/messages
- POST /api/chat/threads/:id/escalate
- POST /api/chat/threads/:id/lock
- POST /api/chat/threads/:id/redact
- GET /api/chat/threads/:id/export
- POST /api/chat/attachments

## 6) Security Controls

- Origin checks on mutating endpoints
- Authn + RBAC checks on all endpoints
- Payload allow-list validation
- Message body size limit (64KB)
- Attachment size limit (10MB)
- Per-user send rate limit
- Audit event append on each state change/export

## 7) PASS Gates

- PASS-1: Models + indexes + RBAC + immutable REST storage path
- PASS-2: UI role surfaces + attachments + realtime/polling delivery
- PASS-3: automation hooks + deterministic export pack + close pack

## 8) Evidence + Audit

Each mutation writes control/audit event with:
- actor identity/role
- action
- timestamp
- related thread/entity
- deterministic event hash

No action path may bypass audit append.
