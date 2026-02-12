# Regulator Walkthrough

## Objective
Verify a published public microsite hash against immutable snapshot records.

## Steps
1. Obtain hash from governance evidence or snapshot record.
2. Call:
   - `GET /api/regulator/public-site/verify?hash=<hash>`
3. Confirm response:
   - `status=VALID`
   - expected `entityId`, `entityType`, `version`, `publishedAt`

## Notes
- Regulator role is read-only.
- Verification endpoint does not expose mutation surfaces.
- Invalid/unknown hashes return `INVALID`.

