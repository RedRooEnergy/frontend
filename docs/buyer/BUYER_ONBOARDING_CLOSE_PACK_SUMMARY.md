# Buyer Onboarding Audit v1 — PASS

This close-pack note records that Buyer Onboarding Audit v1 completed with PASS-1 status `PASS` on runId `20260211T153001135Z--cc942e36`.

## Evidence Verification (Hash Check)

1. Confirm the SHA file exists:  
`artefacts/buyer-onboarding-audit/summary.buyer-onboarding.20260211T153001135Z--cc942e36.sha256`
2. Recompute the PDF hash:  
`shasum -a 256 artefacts/buyer-onboarding-audit/summary.buyer-onboarding.20260211T153001135Z--cc942e36.pdf`
3. Compare the computed digest to the digest in the `.sha256` file.  
Expected digest: `7fde3c7e95438627db4c584e5b0161dfc0b1c110be20d6d08e64c04c2e489c57`

If both values match, evidence integrity is verified for the close-pack PDF.
