# REGULATOR ADDENDUM — EXT-WECHAT-07 Public Key Distribution & Verification

## Document Control Header

Document Title: REGULATOR ADDENDUM — EXT-WECHAT-07 Public Key Distribution & Verification  
Document ID: RRE-REG-ADD-EXT-WECHAT-07-v1.0  
Version: v1.0  
Status: LOCK-READY  
Classification: Regulator / External Auditor Distribution  
Effective Date: 2026-02-14  
Authority: Marketplace Operator — RedRooEnergy  
Change Control: Required for any modification

Baseline Governance Commit:  
`9e2ab9a3e6f0cd808f535f6d5ec29fc6ebc3a982`

## 1. Purpose

This Addendum formally notifies regulators and authorized auditors of the availability of a read-only public key distribution endpoint supporting independent verification of WeChat export signature artefacts under EXT-WECHAT-07.

This addendum does not expand platform authority, mutation rights, or key-management workflows. It provides cryptographic verification transparency only.

## 2. Extension Reference

Extension ID: EXT-WECHAT-07  
Lifecycle Status: CLOSED  
Close Pack:  
`docs/communications/EXT-WECHAT-07_CLOSE_PACK.md`

EXT-WECHAT-07 introduces a regulator-guarded, GET-only public key endpoint for detached signature verification of export manifests.

No mutation capabilities were introduced.

## 3. Public Key Distribution Endpoint

Route:  
`GET /api/wechat/regulator-public-key`

Access Model:  
Regulator-guarded (role-based access)  
Extension-flag gated  
Signature-flag gated  
Fail-closed posture

Response Structure:

```json
{
  "keyId": "string",
  "algorithm": "RSA-SHA256",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----...",
  "fingerprintSha256": "hex",
  "generatedAt": "ISO-8601"
}
```

Security Properties:

- GET-only route surface
- No mutation methods exposed
- Private key material never exposed
- Explicit 404 responses when extension or signature support disabled
- RSA-only enforcement
- SPKI public key format
- SHA-256 fingerprint over DER-encoded SPKI bytes

## 4. Signature Verification Workflow

The complete detached verification procedure is documented in:

`docs/communications/WECHAT_EXPORT_SIGNATURE_VERIFICATION_GUIDE.md`

Verification requires:

- `manifest.json`
- `manifest.sha256.txt`
- `manifest.sig.txt`
- Public key from `GET /api/wechat/regulator-public-key`

Verification is performed using OpenSSL and SHA-256 digest checks.

The platform does not require auditors to access private keys.

## 5. Governance Aggregator Inclusion

The Platform Governance Aggregator (PGA) includes a deterministic rule:

Rule ID: GOV-WECHAT-07  
Severity: CRITICAL  
Scoring: Binary PASS/FAIL  
Impact Surface: Communications / Cryptographic Integrity

The rule statically verifies:

- GET-only route posture
- Regulator guard enforcement
- Extension and signature flag gating
- Explicit disabled-path 404 responses
- RSA-only enforcement in public key helper
- SPKI PEM + DER fingerprint implementation
- Presence of invariant guard tests
- Presence of Close Pack artefact

On failure:

- Governance badge state = DEGRADED
- Cryptographic integrity pill = RED
- Governance score deduction = 8%

This rule is enforced in CI at baseline commit:

`9e2ab9a3e6f0cd808f535f6d5ec29fc6ebc3a982`

CI pipeline fails if GOV-WECHAT-07 does not PASS.

## 6. Authority & Boundary Statement

EXT-WECHAT-07 does NOT:

- Expose private key material
- Provide key rotation APIs
- Introduce signing capabilities
- Modify export generation logic
- Expand user authority roles
- Introduce mutation routes
- Alter escrow, pricing, or compliance enforcement

This extension strictly enhances external verification transparency.

## 7. Regulatory Assurance Statement

As of the baseline commit referenced above:

- EXT-WECHAT-07 is CLOSED and governance-locked
- Public key endpoint is regulator-guarded and read-only
- Cryptographic enforcement (RSA-only, SPKI, SHA-256) is mandatory
- Disabled-path posture is fail-closed
- CI enforces invariant preservation
- Platform Governance Aggregator integrates the rule deterministically

The extension is regulator-safe within its approved scope.

## 8. Change Control Requirement

Any modification to:

- Public key route posture
- Cryptographic algorithm enforcement
- Disabled-path logic
- Aggregator scoring
- CI enforcement
- Close Pack documentation

Requires:

- Formal change request
- Version increment
- Updated Close Pack
- Updated Aggregator registry
- Re-approval

No exceptions.

## 9. Final Declaration

This Addendum certifies that EXT-WECHAT-07 has been implemented, governance-integrated, and enforcement-verified under baseline commit:

`9e2ab9a3e6f0cd808f535f6d5ec29fc6ebc3a982`

The platform now supports independent regulator verification of export signatures without expanding operational authority.

END OF DOCUMENT
