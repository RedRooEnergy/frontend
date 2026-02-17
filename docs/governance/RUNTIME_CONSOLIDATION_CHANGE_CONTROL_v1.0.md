# Runtime Consolidation Change Control v1.0
Version: v1.0
Date: 2026-02-16
Status: ACTIVE

## Controlled Assets
- `runtime-unified-backend/src/app.ts`
- `runtime-unified-backend/src/server.ts`
- `runtime-unified-backend/src/db/mongo.ts`
- `runtime-unified-backend/src/config/env.ts`
- `runtime-unified-backend/src/routes/**`
- `.github/workflows/runtime-unified-boot-integration.yml`
- `runtime-unified-backend/tools/validation/run-runtime-boot-contract.mjs`

## Change Classes
### Class A — Assembly & Packaging (Allowed in consolidation)
Examples:
- mount-point wiring
- startup/shutdown lifecycle hardening
- CI validation wiring
- artifact/report generation

Approval:
- Pull request
- CI PASS on runtime boot validation
- governance reviewer sign-off

### Class B — Subsystem Authority Expansion (Not allowed in Phase 10.5)
Examples:
- introducing new payment/shipping/CRM/email operational endpoints
- adding new business state machines
- adding new financial decision surfaces

Approval:
- deferred to subsystem implementation phase
- separate governance authorization required

## Merge Requirements
Any change to controlled assets must include:
1. Rationale linked to runtime consolidation scope
2. Updated governance document if behavior/contract changes
3. Passing CI artifacts from runtime boot validation

## Enforcement Note
Known harness exit-code inconsistency requires report-status parsing for orchestration gate checks until corrected in a later hardening phase.
