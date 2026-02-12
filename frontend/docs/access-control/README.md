# Access Control + Dashboards RBAC

This implementation provides a role-based access control reference stack for dashboard APIs and UI route gating in Next.js.

## Stack

- Next.js (App Router) + TypeScript
- In-memory seed dataset for deterministic local validation
- Signed bearer token (HMAC, JWT-like payload)
- RBAC middleware/policy enforcement in server layer
- Immutable audit hash chain for authorization decisions

## Roles

| Role | Write Scope | Read Scope |
|---|---|---|
| `BUYER` | own orders | own orders/documents, compliance docs |
| `SUPPLIER` | own products/compliance submissions | own orders |
| `FREIGHT` | shipment updates | shipment + linked orders |
| `INSTALLER` | installation confirmations | installer workload + linked orders |
| `RRE_ADMIN` | operational dashboards | finance + marketing (read-only) |
| `RRE_FINANCE` | settlements + pricing rules | operational/compliance (read-only) |
| `RRE_MARKETING` | promotions + email operations | other domains (read-only) |
| `RRE_CEO` | no mutations | read-all |

## Key Files

- RBAC matrix: `frontend/lib/rbac/matrix.ts`
- RBAC policy + deny guard: `frontend/lib/rbac/policy.ts`
- Immutable audit chain: `frontend/lib/rbac/audit.ts`
- Auth token: `frontend/lib/auth/token.ts`
- API services: `frontend/lib/api/dashboardService.ts`
- API routes: `frontend/app/api/**`
- Guarded UI: `frontend/app/access-control/**`

## Local Run

```bash
cd frontend
npm ci
npm run dev
```

Open:

- `/access-control/login`
- `/access-control/dashboard`

## Seeded Users

Seed users are in `frontend/lib/data/mockDb.ts`:

- buyer@redroo.test
- supplier@redroo.test
- freight@redroo.test
- installer@redroo.test
- admin@redroo.test
- finance@redroo.test
- ceo@redroo.test
- marketing@redroo.test

## API Reference

OpenAPI spec:

- `frontend/docs/access-control/openapi.yaml`

## SQL Migration

Schema migration:

- `infrastructure/migrations/20260212_access_control_rbac.sql`

Includes:

- `users`
- `roles`
- `role_assignments`
- `permissions`
- `dashboards`
- `resources`
- `audit_log` (with `previous_hash` + `record_hash` for immutable chain)

## Test Execution

```bash
cd frontend
npx tsx tests/access-control/runAccessControlTests.ts
```

The test runner validates:

- allowed actions succeed
- forbidden actions fail with `403` semantics
- audit entries include immutable hash chain data
- dashboard read models return stable shapes

