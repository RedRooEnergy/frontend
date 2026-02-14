# EXT-CHAT-01 Threat Model

Version: v1.0
Status: ACTIVE
Reference: OWASP WebSocket + API Security guidance

## 1) Threat Surfaces

- Unauthorized thread access
- Cross-site request abuse on mutating endpoints
- Message flooding / abuse / resource exhaustion
- Oversized payload and attachment abuse
- Replay or duplicate mutation attempts
- Data tampering or post-facto message edits
- Export evidence inconsistency

## 2) Mandatory Mitigations

### Authn/Authz
- Require authenticated session for all chat APIs
- Apply server-side RBAC policy checks per endpoint action
- Never trust client-side role claims

### Origin + Request Integrity
- Validate Origin on mutating routes (POST/PATCH/PUT/DELETE)
- Reject cross-site origins not in allow-list
- Use platform CSRF/session safeguards for browser mutations

### Input and Size Controls
- Allow-list request schema fields
- Reject unknown payload fields
- Enforce message max size (64KB)
- Enforce attachment max size (10MB)
- Restrict MIME types to approved set

### Rate Limiting
- Per-user and per-thread rate limits on message posting
- Return 429 with retry metadata
- Record rate-limit denials in audit/control telemetry

### Immutability and Audit
- Message records append-only
- No body edits or deletes
- Redaction by event only
- Thread lock/escalation state changes must append audit events

### Export Integrity
- Deterministic manifest generation
- SHA-256 for message and attachment evidence entries
- Export request itself logged as audit event

## 3) Realtime Considerations

If WebSockets are enabled in later phase:
- Validate Origin at handshake
- Require auth at handshake or first frame before subscription
- Enforce per-connection and per-user message rate limits
- Enforce message size limits
- Idle timeout + heartbeat

If polling is used:
- Same auth/origin/rate controls apply to POST endpoints
- GET polling endpoints remain read-only and RBAC-scoped

## 4) Abuse Escalation

Flag and escalate events on:
- threat/abuse keywords
- repeated rate-limit violations
- repeated unauthorized access attempts

Escalation must create immutable audit evidence with actor and thread context.
