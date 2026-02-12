# EXT-PUBLIC-PARTICIPANT-SITES-01 Governance

## Scope
Unified public participant microsites for `SUPPLIER | CERTIFIER | INSTALLER | INSURANCE` with an optional paid weekly placement layer.

## Core Guarantees
- Public pages render `PUBLISHED` snapshots only.
- Draft content never renders on public routes.
- Slug is immutable after first publish (`slugLocked=true`).
- Publish computes deterministic payload hash (`SHA-256`) and stores `renderedHash`.
- Suspension/unverified conditions auto-unpublish and block placement eligibility.
- Public contact is routed through governed dispatch (`EXT-EMAIL-01` / `EXT-WECHAT-01` adapters), no raw direct addresses.
- Placement locks reference `snapshotVersion` and store deterministic `lockHash`.

## Public Routes
- `/suppliers/{slug}`
- `/certifiers/{slug}`
- `/installers/{slug}`
- `/insurance/{slug}`

## API Surface
- `GET /api/public-sites/read/:entityType/:slug`
- `GET /api/public-sites/read/list/:entityType`
- `POST /api/public/contact`
- `GET /api/regulator/public-site/verify?hash=`
- Admin mutation routes under `/api/admin/public-sites/*`

## Placement Layer
Placement contracts do not grant publication rights. Publication eligibility and compliance gating always override placement.

## Status Model
- Profile: `PENDING | APPROVED | SUSPENDED | REVOKED`
- Snapshot: `DRAFT | PUBLISHED | SUSPENDED`
- Placement contract: `ACTIVE | PAUSED | CANCELLED`

