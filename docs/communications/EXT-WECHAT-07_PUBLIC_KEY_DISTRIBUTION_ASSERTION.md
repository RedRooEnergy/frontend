# EXT-WECHAT-07 — Public Key Distribution Assertion
Version: v1.0
Status: IMPLEMENTATION AUTHORIZED
Classification: Read-Only Cryptographic Trust Surface
Authority Impact: NONE
Mutation Rights: NONE
Route Posture: GET-Only
Change Control: REQUIRED for boundary expansion

## Purpose
Provide regulator/auditor access to the public verification key corresponding to `WECHAT_EXPORT_SIGNATURE_PRIVATE_KEY_PEM` so detached export signatures can be verified independently.

## Scope
In scope:
- GET-only public key distribution endpoint
- key metadata (`keyId`, `algorithm`)
- public key PEM delivery
- fingerprint (`SHA-256` over DER-encoded SPKI public key)
- auditor verification documentation

Out of scope:
- private key exposure
- key mutation endpoints
- key rotation workflow (future extension)

## Endpoint Contract
Route:
- `GET /api/wechat/regulator-public-key`

Response:
```json
{
  "keyId": "...",
  "algorithm": "RSA-SHA256",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----...",
  "fingerprintSha256": "...",
  "generatedAt": "ISO"
}
```

## Access Model
This endpoint is regulator-guarded (not public) to stay aligned with existing regulator-slice posture and extension flag governance.

## Exposure Rules
Must never expose:
- private key material
- environment secrets
- access tokens
- webhook tokens

## Failure Posture
Fail closed when signature prerequisites are not valid:
- signature feature disabled
- key id missing
- private key missing or malformed

## Acceptance Criteria
PASS:
- endpoint is GET-only
- endpoint is extension-flag gated
- endpoint is regulator-guarded
- response includes keyId, algorithm, publicKeyPem, fingerprintSha256, generatedAt
- private key never appears in responses

FAIL:
- non-GET route exposed
- private key leakage
- endpoint bypasses extension/signature gating
