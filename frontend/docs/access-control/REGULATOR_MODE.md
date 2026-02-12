# Regulator Mode — Read-Only Portal

Status: ACTIVE

## Scope

Regulator mode provides read-only oversight access through the isolated portal surface:

- `/portal/login`
- `/portal/dashboard/regulator`
- `/portal/evidence`

## Authority Boundaries

- Role: `RRE_REGULATOR`
- Allowed: `READ`-only access to oversight subjects
- Denied: all mutation actions (`CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `RELEASE`, `CONFIRM`)

Mutation denial is enforced both by permission matrix and API guard:

- `POST /api/dashboard/{domain}` returns `403` when `actor.role === RRE_REGULATOR`

## Evidence and Traceability

Regulator mode exposes immutable evidence references via:

- `GET /api/portal/evidence`

Evidence index includes:

- latest scorecard path
- latest summary PDF path
- latest SHA-256 file path
- parsed SHA-256 value
- tracked governance tag commit references

Portal access events are hash-chained in audit log structures for replay visibility.
