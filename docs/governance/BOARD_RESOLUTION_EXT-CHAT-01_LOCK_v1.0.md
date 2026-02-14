# BOARD RESOLUTION — EXT-CHAT-01 Lock Declaration

Document ID: RRE-BRD-RES-EXT-CHAT-01-LOCK-v1.0  
Version: v1.0  
Status: LOCK-READY  
Classification: Internal Governance / Board Ratification  
Effective Date: 2026-02-14  
Authority: Board of Directors — RedRooEnergy  
Change Control: Required for amendment

## 1. Resolution Scope

This resolution ratifies completion and governance lock of EXT-CHAT-01 (RRE Operational Chat Subsystem) as a marketplace-native, immutable, role-segregated communication control.

Referenced artefacts:
- Extension Specification: `docs/extensions/EXT-CHAT-01/EXT-CHAT-01_SPEC.md`
- Acceptance Gates: `docs/extensions/EXT-CHAT-01/ACCEPTANCE.md`
- Threat Model: `docs/extensions/EXT-CHAT-01/THREAT_MODEL.md`
- Close Pack: `docs/extensions/EXT-CHAT-01/CLOSE_PACK.md`
- PASS-1 baseline commit: `38ae095`
- PASS-2 baseline commit: `bebbbdd`
- PASS-3 governance baseline commit: `5323206`
- Playwright smoke baseline commit: `02d3227`

## 2. Board Determinations

The Board determines that EXT-CHAT-01:
- introduces no external chat platform dependency,
- preserves immutable message doctrine (append-only; no edit/delete),
- enforces server-side RBAC on all chat routes,
- enforces mutation-origin and authenticated actor checks,
- records audit/control events for all state-changing actions,
- produces deterministic evidence exports with hash-manifest verification,
- is CI-gated by chatbot governance scorecard and workflow.

## 3. Governance Impact Class

Impact Class: Operational Communication Integrity  
Scoring Control: Binary PASS/FAIL via chatbot scorecard + workflow gate  
Failure Severity: CRITICAL  
Badge Surface: `GET /api/governance/chatbot/badge`  
Status Surface: `GET /api/governance/chatbot/status`

## 4. Lock Declaration

The Board ratifies EXT-CHAT-01 as IMPLEMENTED, GOVERNANCE-ACTIVE, and LOCKED at baseline commit:

`02d3227`

Lock posture applies to storage doctrine, RBAC policy, route security controls, evidence export behavior, and governance test gate.

## 5. Explicit Boundary Conditions

This ratification does NOT authorize:
- external platform integrations (including WeChat, WhatsApp, or equivalent chat bridges),
- message edit/delete semantics,
- client-only authorization controls,
- bypass of audit/control event logging,
- authority expansion into escrow, payout, or compliance override domains.

## 6. Control Conditions

Any modification to EXT-CHAT-01 scope, immutability doctrine, route posture, export integrity behavior, scorecard gate behavior, or badge/status semantics requires:
- formal change request,
- document version increment,
- updated close pack evidence,
- Board re-ratification.

No exceptions.

## 7. Signature Block

Board Chair (or delegate): ____________________  
CTO / Engineering Authority: ____________________  
Compliance Lead: ____________________  
Date (UTC): ____________________
