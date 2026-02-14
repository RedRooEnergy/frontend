# WeChat Audit Runbook
Version: v1.0
Status: Operational

## 1) Purpose
Run governance checks for EXT-WECHAT-01 and generate evidentiary outputs.

## 2) Command
From `frontend/`:

```bash
npm run test:wechat
```

## 3) Outputs
Generated in `frontend/artefacts/wechat/`:
- `scorecard.<RUN_ID>.json`
- `attestation.<RUN_ID>.pdf`
- `summary.<RUN_ID>.pdf`
- `manifest.<RUN_ID>.json`
- `manifest.<RUN_ID>.sha256`
- `badge.wechat-governance.svg`
- history copy under `frontend/artefacts/wechat/history/`

## 4) Minimum Governance Checks
- taxonomy completeness
- forbidden endpoint absence
- deterministic renderer hash
- RBAC route boundary checks
- dispatch immutability ordering
- link allowlist enforcement
- binding verification guard
- provider response redaction

## 5) Trend Rule
Regression is triggered when either:
- failCount increases vs previous run, or
- passCount degrades in >=2 comparisons across last 5 runs.

Regression result forces overall `FAIL` and non-zero exit.

## 6) Signing
Audit scorecard payload is HMAC-signed:
- env: `WECHAT_AUDIT_SIGNING_SECRET`
- default dev fallback used outside controlled envs

## 7) CI
Workflow:
- `.github/workflows/wechat-system-ci.yml`

Triggers when WeChat lib/routes/tests/docs paths change.
