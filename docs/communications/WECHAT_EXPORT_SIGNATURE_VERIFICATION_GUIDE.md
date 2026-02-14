# WeChat Export Signature Verification Guide
Version: v1.0
Audience: Regulator / External Auditor

## Purpose
Verify that `manifest.json` shipped in an export pack is authentic and unchanged using:
- `manifest.sha256.txt` (hash check)
- `manifest.sig.txt` (detached RSA signature)
- `/api/wechat/regulator-public-key` (public verification key)

## Required Files
From export pack:
- `manifest.json`
- `manifest.sha256.txt`
- `manifest.sig.txt`

From endpoint:
- `publicKeyPem`
- `fingerprintSha256`

## Step 1 — Validate Manifest Hash
```bash
sha256sum manifest.json
cat manifest.sha256.txt
```
The SHA-256 digest from `sha256sum` must match the digest listed in `manifest.sha256.txt`.

## Step 2 — Extract Detached Signature
```bash
grep '^signatureBase64=' manifest.sig.txt | cut -d= -f2- | base64 -d > signature.bin
```

## Step 3 — Save Public Key
Call `GET /api/wechat/regulator-public-key` and save `publicKeyPem` into `public_key.pem`.

## Step 4 — Verify Detached Signature
```bash
openssl dgst -sha256 \
  -verify public_key.pem \
  -signature signature.bin \
  manifest.json
```
Expected output:
```text
Verified OK
```

## Step 5 — Validate Public Key Fingerprint
```bash
openssl pkey -pubin -in public_key.pem -outform DER | openssl dgst -sha256
```
The resulting digest must match `fingerprintSha256` from `/api/wechat/regulator-public-key`.

## Notes
- Signature verification is detached and performed over the exact shipped `manifest.json` bytes.
- Private key material is never required or exposed to auditors.
- If signature support is disabled, `manifest.sig.txt` will not be present and endpoint may return disabled/unavailable status.
