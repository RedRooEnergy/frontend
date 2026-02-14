# EXT-WECHAT-06 — Regulator Manifest Signature Assertion
Version: v1.0
Status: IMPLEMENTATION AUTHORIZED
Authority Impact: NONE
Mutation Rights: NONE
Change Control: REQUIRED for boundary expansion

## Purpose
Add detached digital signature support for `manifest.json` in regulator export packs to strengthen non-repudiation beyond hash-only verification.

## Scope
In scope:
- Detached signature generation over exported `manifest.json` bytes.
- Optional signature artifact `manifest.sig.txt` in ZIP output.
- Read-only export semantics preserved.

Out of scope:
- Changes to domain mutation rights.
- Changes to WeChat message/state authority.
- Changes to regulator slice masking rules.

## Signature Contract
When enabled, export pack includes:
- `manifest.sig.txt`

Signature artifact must include:
- `keyId`
- `algorithm`
- `signatureBase64`

Signing input:
- exact `manifest.json` bytes as shipped in pack

Algorithm:
- `RSA-SHA256` (detached signature)

## Config Contract
Environment controls:
- `WECHAT_EXPORT_SIGNATURE_ENABLED` (default false)
- `WECHAT_EXPORT_SIGNATURE_PRIVATE_KEY_PEM` (required when enabled)
- `WECHAT_EXPORT_SIGNATURE_KEY_ID` (required when enabled)

If enabled and signing prerequisites are missing/invalid, export must fail closed.

## Compatibility Contract
- Existing four-file pack remains valid when signature is disabled.
- Signature is additive and optional by flag.
- Existing hash verification (`manifest.sha256.txt`) remains authoritative and unchanged.

## Security / Exposure Rules
Must not expose:
- private key material
- raw tokens/secrets
- raw message bodies

Routes remain:
- regulator-only
- GET-only

## Acceptance Criteria
PASS:
- signature-enabled exports include `manifest.sig.txt`
- signature verifies against shipped `manifest.json` bytes
- signature-disabled exports preserve existing file set and contract
- GET-only route posture preserved
- audit append and rate-limit invariants preserved

FAIL:
- private key exposed in response surface
- signature computed from non-final manifest bytes
- mutation surfaces added
