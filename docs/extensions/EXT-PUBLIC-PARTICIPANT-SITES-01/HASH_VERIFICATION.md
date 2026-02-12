# Hash Verification

## Deterministic Payload Shape
```json
{
  "v": 1,
  "entityType": "SUPPLIER|CERTIFIER|INSTALLER|INSURANCE",
  "slug": "immutable-slug",
  "version": 3,
  "seoMeta": {},
  "heroImage": "",
  "logo": "",
  "contentJSON": {}
}
```

## Snapshot Hash
- Algorithm: `SHA-256`
- Field: `renderedHash`
- Set at publish time only.

## Placement Lock Hash
Lock hash payload includes:
- weekId
- entityId/entityType
- contractId
- tier
- position
- snapshotVersion

## Regulator Endpoint
`GET /api/regulator/public-site/verify?hash=<sha256>`

Responses:
- `VALID` + `entityId`, `entityType`, `version`, `publishedAt`
- `INVALID`

