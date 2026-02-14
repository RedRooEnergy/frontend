# EXT-WECHAT-01 — UI Surface Assertion
Version: v1.0
Status: DESIGN ASSERTION (UI SURFACE)
Runtime Impact: NONE
Change Control: REQUIRED

## 1) Approved WeChat Icon Locations
The WeChat channel icon is permitted only on governed, in-platform surfaces:

- Buyer dashboard (including buyer notifications/home bell area)
- Supplier dashboard
- Admin dashboard
- Product page contact area

No additional placements are approved without change control.

## 2) Icon State Machine
The WeChat icon must render binding-aware state only:

- `NONE`
- `PENDING`
- `VERIFIED`
- `REVOKED`
- `ERROR`

State meaning:

- `NONE`: no binding exists for actor/app context
- `PENDING`: binding initiation exists but not verified
- `VERIFIED`: active bound channel
- `REVOKED`: previously bound but no longer active
- `ERROR`: binding or channel status requires operator attention

## 3) Click Behavior (Navigation-Only)
Clicking the WeChat icon is limited to internal platform navigation.

- Allowed: internal route transition to governed communications/governance screens
- Forbidden: sending a message, opening external chat, launching an embedded widget

The icon is status + navigation only.

## 4) No Embedded Chat Rule
The platform must not embed a live WeChat chat surface.

Forbidden patterns:

- iframe/webview chat embedding
- direct chat popup invocation
- unofficial WeChat web widget injection

WeChat remains an external governed channel; platform actions remain authoritative only via authenticated platform routes.

## 5) Product Page Correlation Requirement
Product-page WeChat navigation must carry correlation context.

Minimum required context on internal navigation:

- `productId`
- `supplierId` (or approved supplier correlation key)

Correlation parameters are navigation metadata only and must not trigger message dispatch.

## 6) Governance Boundary
The icon surface does not create or bypass communication authority.

All send/retry/dispatch operations remain governed through approved backend services and audited pathways only.
