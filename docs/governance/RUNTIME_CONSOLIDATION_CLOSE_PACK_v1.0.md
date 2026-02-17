# Runtime Consolidation Close Pack v1.0
Version: v1.0
Phase: 10.5.90 — Documentation & Close Pack
Status: CONSOLIDATION BASELINE READY
Date: 2026-02-16
Baseline SHA: 37740c603162bd58a06ff360a19ca82442a7fbb1
Branch: governance-clean-rebuild

## 1) Scope
This close pack captures the consolidated runtime architecture assembled under Phase 10.5 without introducing new business logic.

## 2) Mounted Route Families (Authoritative)
Unified runtime mount points in `runtime-unified-backend/src/app.ts`:
- `/api/payments/refunds` -> refunds router
- `/api/admin/queues` -> admin queues router
- `/api/settlement/holds` -> settlement holds router

Core runtime endpoints:
- `GET /healthz`
- deterministic 404 JSON fallback for unknown routes

## 3) DB Lifecycle Ownership
DB ownership is centralized to runtime startup:
- `runtime-unified-backend/src/server.ts`
  - startup calls `connectDb()` under timeout guard
  - shutdown calls `disconnectDb()` on SIGINT/SIGTERM
- `runtime-unified-backend/src/db/mongo.ts`
  - shared client promise
  - shared DB promise
  - startup ping verification
  - deterministic cleanup API

No route module performs DB initialization.

## 4) Startup Watchdog Design
Startup enforces fail-fast DB readiness:
- timeout mechanism in `server.ts`
- config in `runtime-unified-backend/src/config/env.ts` via `DB_STARTUP_TIMEOUT_MS`
- on timeout/failure, startup exits non-zero with `DB_STARTUP_TIMEOUT`

## 5) CI Enforcement Model
Workflow:
- `.github/workflows/runtime-unified-boot-integration.yml`

Job A (required on push/PR):
- build runtime
- run runtime boot contract validator (`npm run validate:runtime-boot-contract`)
- upload `runtime-boot-contract-report.json`

Job B (manual gate):
- run orchestration harness against unified runtime
- parse `frontend/orchestration-report.json`
- fail if `report.status !== "PASS"` (does not trust harness process exit)
- upload orchestration artifacts

## 6) Runtime Validation Artefacts
Phase documents produced:
- `docs/governance/RUNTIME_BOOT_CONTRACT_VALIDATION_REPORT_v1.0.md`
- `docs/governance/RUNTIME_TESTMODE_STABILIZATION_BLOCKERS_v1.0.md`
- `docs/governance/RUNTIME_PHASE11_HARNESS_SMOKE_REPORT_v1.0.md`
- `docs/governance/RUNTIME_CI_BOOT_INTEGRATION_REPORT_v1.0.md`

## 7) Known Missing Subsystems (Still Out of Scope for 10.5)
Per authoritative inventory, these subsystem surfaces remain absent:
- payments checkout/status orchestration contracts
- shipping quote/select/shipment contracts
- CRM case query/read contracts
- email queue/log contracts

Reference:
- `docs/governance/RUNTIME_SURFACE_INVENTORY_v1.0.md`

## 8) Governance Constraints Observed
- No subsystem authority expansion in consolidation phase.
- Invalid 10.5.50 subsystem creation attempt was reverted and documented.
- Consolidation remained assembly-only and validation-focused.

## 9) Baseline Freeze Readiness
This close pack declares runtime consolidation ready for baseline freeze/tag preparation in 10.5.100, subject to governance approval.
