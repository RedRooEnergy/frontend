# Wave 1 Extension Integration Plan (EXT-02, EXT-03, EXT-04, EXT-05)
Version: v1.0 (LOCKED)  
Implementation: Authorised baseline (no changes without change control)  
Scope: Wave 1 from EXTENSIONS_INTEGRATION_PROGRAM v1.0 (LOCKED)  
Dependencies: EXT-01 (completed foundation)  

## Common Rules (all Wave 1 extensions)
- Feature flags: required; default OFF in production; staging-only enablement for UAT.  
- Governance: locked per registry; no changes without change control.  
- Evidence: UAT + Audit pack required (screenshots/log refs + hashes).  
- Forbidden: bypassing governance lock, enabling in production without sign-off, modifying payments/secrets/webhooks.  
- Audit: all state changes emit audit events with IDs and timestamps.  

## EXT-02
- Entry points: Define UI/route/API touchpoints (to be detailed in implementation ticket).  
- Data models: Align with foundation data shapes; extend only via approved schemas.  
- APIs: Use existing App Router handlers; require auth and audit on mutations.  
- Audit events: EXT02_ACTION_INITIATED, EXT02_ACTION_COMPLETED (to be defined precisely in implementation).  
- Feature flag: NEXT_PUBLIC_EXT02 (off by default).  
- Dependencies: EXT-01.  
- UAT evidence: happy path, failure path, audit log sample, feature-flag off/on checks.  
- Forbidden actions: enabling in prod; mutating data without audit; introducing new payment/payout logic.  

## EXT-03
- Entry points: TBD in implementation story; must respect locked governance.  
- Data models/APIs: Only additive, no breaking changes; require auth.  
- Audit events: EXT03_ACTION_INITIATED, EXT03_ACTION_COMPLETED.  
- Feature flag: NEXT_PUBLIC_EXT03 (off by default).  
- Dependencies: EXT-01.  
- UAT evidence: as per EXT-02.  
- Forbidden: prod enablement without sign-off; unaudited writes; new payment flows.  

## EXT-04
- Entry points: TBD; ensure compatibility with Supplier/Admin spine.  
- Data models/APIs: Additive only; validate inputs; fail closed.  
- Audit events: EXT04_ACTION_INITIATED, EXT04_ACTION_COMPLETED.  
- Feature flag: NEXT_PUBLIC_EXT04 (off by default).  
- Dependencies: EXT-01.  
- UAT evidence: same structure; include negative test.  
- Forbidden: bypassing lifecycle states; enabling in prod.  

## EXT-05
- Entry points: TBD; must not alter checkout/payments.  
- Data models/APIs: Use existing auth/audit wrappers; input validation required.  
- Audit events: EXT05_ACTION_INITIATED, EXT05_ACTION_COMPLETED.  
- Feature flag: NEXT_PUBLIC_EXT05 (off by default).  
- Dependencies: EXT-01.  
- UAT evidence: on/off flag behaviour, audit presence, error handling.  
- Forbidden: any payment execution changes; prod enablement.  

## Integration Steps (per extension, sequential)
1) Confirm governance lock and dependencies (EXT-01).  
2) Draft implementation ticket referencing this plan; define exact UI/API surfaces and audit events.  
3) Implement behind feature flag (default OFF); staging only.  
4) Run UAT per scripts; capture evidence and hashes.  
5) Produce UAT report and lock implementation version.  
6) Update registry statuses; request change control for prod enablement.  

## Wave Control
- Wave order fixed (EXT-02 → EXT-05).  
- Do not start Wave 2 until Wave 1 UAT and locks are complete.  

## Implementation Lock
- Wave 1 implementation is locked. Feature flags remain OFF by default in production. Changes require formal change control.
