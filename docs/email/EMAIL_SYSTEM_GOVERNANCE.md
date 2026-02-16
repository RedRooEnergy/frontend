# RRE Email Messaging System Governance (EXT-EMAIL-01)

Version: v1.0  
Status: LOCKED  
Owner: Marketplace Operator (RRE)

## Purpose
EXT-EMAIL-01 governs all outbound email as operational evidence. Every email must be event-driven, template-locked, deterministic, and auditable.

## Non‑Negotiable Rules
1) No email without a canonical eventCode.  
2) No email outside EMAIL_EVENT_TAXONOMY.md.  
3) No manual/free‑form send endpoints or admin free‑send UI.  
4) Every send attempt must create an immutable dispatch record.  
5) LOCKED templates only in production.  
6) Regulators never receive automated emails.  
7) Role + scope enforced at send time.  
8) Rendered content hashed (SHA‑256) and stored.  
9) Provider is abstracted; provider errors never alter content.

## Scope
Includes: buyer, supplier, service partner, order, payment, compliance, freight, returns, disputes, admin governance.  
Excludes: marketing blasts, newsletters, ad‑hoc admin messages.

## Template Governance
Templates are governed artefacts with:
templateId, eventCode, roleScope, language, subject/body templates, allowedVariables, version, status.

Status gates:
- DRAFT: preview only  
- APPROVED: non‑prod only  
- LOCKED: production required  
- RETIRED: never sent

## Idempotency & Retry
Idempotency key: eventCode + recipientUserId + stableEntityKey.  
Retries are controlled by policy (max attempts + backoff).

## Audit & Export
Dispatch records are append‑only.  
Exports: JSON + PDF + manifest hash.

## Change Control
Any change to event taxonomy, templates, or dispatch logic requires formal change control and version bump.
