# RedRooEnergy — Sandbox E2E Test Plan (Pay → Refund → Settle)

This harness exercises the full sandbox financial lifecycle with Stripe (test) and Wise (sandbox) against the running app.

## Prerequisites
- `node` and `npm` installed
- App server running locally at `http://localhost:3000` (or set `BASE_URL`)
- Env vars (test/sandbox only):
  - `STRIPE_SECRET_KEY_TEST`
  - `STRIPE_WEBHOOK_SECRET_TEST`
  - `WISE_SANDBOX_API_KEY`
  - `WISE_SANDBOX_PROFILE_ID`
  - `BASE_URL` (default `http://localhost:3000`)

Create `tests/sandbox/.env.local` (or export env) based on `env.example`.

## What it does
1. Seeds buyer/supplier/product/order fixtures (local JSON for deterministic requests).
2. Exercises:
   - Stripe checkout session creation (no redirect)
   - Simulated Stripe webhook (payment success)
   - Refund request + refund webhook
   - Wise sandbox settlement (admin-triggered)
   - Negative cases: settlement blocked after refund, refund blocked after settlement, webhook idempotency, pricing hash mismatch
3. Writes `tests/sandbox/REPORT.md` with pass/fail per TC and key state snapshots.

## Run
```
cd frontend
node tests/sandbox/runSandboxE2E.ts
```

The script expects the app server running. It uses test headers (`X-TEST-ROLE`, `X-TEST-USERID`) only when `NODE_ENV !== "production"`.

## Troubleshooting
- 401/403: ensure test headers allowed and app running in dev.
- Signature errors: confirm `STRIPE_WEBHOOK_SECRET_TEST` matches fixtures.
- Wise errors: ensure sandbox API key/profile set; network must allow outbound HTTPS.

## Outputs
- `tests/sandbox/fixtures/` : seed and webhook payloads
- `tests/sandbox/REPORT.md` : latest run summary (overwritten each run)
