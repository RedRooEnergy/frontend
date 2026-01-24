EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: Implementation Authorisation
STATUS: AUTHORISED

AUTHORISATION STATEMENT

This document formally authorises implementation of EXT-02 — Catalogue Management
under the following conditions:

- Core baseline remains immutable
- All Core contracts and audit rules must be respected
- Default-deny authorisation applies
- requestId propagation is mandatory
- All state changes must emit audit events
- Catalogue state transitions must be enforced server-side
- No UI implementation is permitted in this phase

ALLOWED IMPLEMENTATION SCOPE

- Draft catalogue lifecycle
- Approval workflow
- Publication controls
- Audit logging
- Authorization enforcement

PROHIBITED ACTIONS

- Direct Core modification
- Bypassing authorization
- Silent state changes
- Schema mutation without Change Control

DEPENDENCIES

- EXT-01 Supplier Onboarding (LOCKED)
- Core Platform (LOCKED)

EFFECTIVE DATE

Authorised upon save of this document.

SIGN-OFF

Status: IMPLEMENTATION AUTHORIZED
