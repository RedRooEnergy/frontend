# WECHAT Production Enablement Checklist

Status: PRE-ENABLEMENT (feature-gated)
Extension: EXT-WECHAT-01

## A) Pre-Enable Verification
- [ ] `npm run test:wechat` passing in CI and local verification.
- [ ] No unresolved WeChat governance regressions in latest audit scorecard.
- [ ] Template registry entries in production are `LOCKED`.
- [ ] No `DRAFT` WeChat templates exist in production datastore.
- [ ] Rate limit guard is active on `POST /api/wechat/bindings/start`.

## B) Secrets Injection
- [ ] Add `WECHAT_AUDIT_SIGNING_SECRET` to GitHub Actions secrets.
- [ ] Add `WECHAT_AUDIT_SIGNING_SECRET` to production environment variables.
- [ ] Add `WECHAT_ACCESS_TOKEN` to production environment variables.
- [ ] Add `WECHAT_API_ENDPOINT` to production environment variables.
- [ ] Add `WECHAT_WEBHOOK_TOKEN` to production environment variables.

## C) Flag Rollout Strategy
Flags remain disabled by default. Enable in two phases:

### Phase 1
- [ ] Set `ENABLE_WECHAT_EXTENSION=true`.
- [ ] Keep `ENABLE_WECHAT_WEBHOOK=false`.
- [ ] Verify outbound dispatches and binding lifecycle only.

### Phase 2
- [ ] Set `ENABLE_WECHAT_WEBHOOK=true` after callback signature validation testing.
- [ ] Verify inbound callback handling and webhook signature enforcement.

## D) Post-Enable Monitoring
- [ ] Monitor dispatch failure rate and provider error code distribution.
- [ ] Monitor binding conversion (`PENDING` -> `VERIFIED`) by day.
- [ ] Confirm regulator overview route returns deterministic hash and expected counts.
- [ ] Confirm retry behavior is bounded (no uncontrolled retry loops).

## E) Rollback Posture
- [ ] If failure rates exceed tolerance, disable `ENABLE_WECHAT_WEBHOOK` first.
- [ ] If extension-wide degradation appears, disable `ENABLE_WECHAT_EXTENSION`.
- [ ] Preserve audit artefacts and dispatch evidence before any rollback changes.
