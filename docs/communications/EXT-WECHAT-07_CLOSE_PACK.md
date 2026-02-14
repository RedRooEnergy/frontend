# EXT-WECHAT-07 — Public Key Distribution & Auditor Verification
## CLOSE PACK (FINAL)

Version: v1.0  
Status: CLOSED  
Closure Date: 2026-02-14  
Owner: Marketplace Operator (RedRooEnergy)

---

## 1. Closure Declaration

EXT-WECHAT-07 is formally CLOSED within its approved scope:
read-only public-key distribution for regulator signature verification.

This extension is governance-locked and cannot expand into mutation,
key-management workflows, or authority-bearing behavior without formal change control.

---

## 2. Governance Artefacts (LOCKED)

| Document | Path | Version | Status |
|---|---|---|---|
| Public Key Distribution Assertion | `docs/communications/EXT-WECHAT-07_PUBLIC_KEY_DISTRIBUTION_ASSERTION.md` | v1.0 | LOCKED |
| Signature Verification Guide | `docs/communications/WECHAT_EXPORT_SIGNATURE_VERIFICATION_GUIDE.md` | v1.0 | LOCKED |

---

## 3. Scope Confirmation

Included:
- GET-only regulator endpoint for public-key distribution
- Key metadata exposure (`keyId`, `algorithm`)
- Public key SPKI PEM exposure (`publicKeyPem`)
- Public key fingerprint exposure (`fingerprintSha256`)
- Explicit disabled-path behavior (`404` when extension/signature disabled)

Excluded:
- Private key exposure
- Key mutation/rotation APIs
- Any non-GET route surface
- Any WeChat domain-state mutation behavior

---

## 4. Implementation Evidence

Commits:
- `9de2c73` — Assertion lock
- `459e207` — Signature public-key extraction helper
- `90be12f` — GET-only regulator public-key endpoint
- `e0ba6cc` — Auditor verification guide
- `3a6099b` — Guard tests for regulator public-key distribution
- `c48828d` — RSA-only enforcement + disabled-path guard hardening

Primary runtime artefacts:
- `frontend/lib/wechat/signaturePublicKey.ts`
- `frontend/app/api/wechat/regulator-public-key/route.ts`
- `frontend/tests/wechat-ui/runWeChatUiTests.ts`

---

## 5. Cryptographic Assertions

1. Public key is derived from configured private key via `crypto.createPrivateKey` + `crypto.createPublicKey`.
2. Algorithm contract is enforced as RSA (`privateKey.asymmetricKeyType === "rsa"`).
3. Public key format is SPKI PEM.
4. Fingerprint is SHA-256 over DER-encoded SPKI bytes.
5. Detached signature verification flow is documented for external auditors.

---

## 6. Security & Governance Assertions

1. No private key material is returned by any route.
2. Route posture remains GET-only and regulator-guarded.
3. Extension flag and signature flag gates are mandatory.
4. Disabled states return explicit `404` responses.
5. No mutation rights were introduced.
6. EXT-WECHAT-03/04/05/06 contracts remain unchanged.

---

## 7. CI Enforcement Evidence

`frontend/tests/wechat-ui/runWeChatUiTests.ts` includes `REGULATOR-PUBLIC-KEY-GUARDS` enforcing:
- GET-only route export
- signature-enabled gate presence
- extension/signature disabled-path checks
- required response field exposure
- forbidden sensitive pattern checks
- RSA helper usage and enforcement checks

Latest local verification at closure:
- `npm run test:wechat-ui` → PASS
- `npm run test:audit-comms` → PASS

---

## 8. Change Control

Any modification to EXT-WECHAT-07 requires:
- formal change request
- version bump
- updated close pack
- governance re-approval

No exceptions.

---

## 9. Final Status

EXT-WECHAT-07 is CLOSED, LOCKED, and regulator-safe within approved boundaries.
