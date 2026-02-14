# BOARD RESOLUTION — EXT-CHAIN-INTEGRITY-01 Implementation Authorization

Document ID: BR-EXT-CHAIN-INTEGRITY-01-IMPLEMENTATION-v1.0  
Version: v1.0  
Status: LOCK-READY  
Classification: Internal Governance / Board Authorization  
Effective Date: 2026-02-14  
Authority: Board of Directors — RedRooEnergy  
Change Control: Required for amendment

## 1. Resolution Scope

This resolution adopts the EXT-CHAIN-INTEGRITY-01 implementation authorization packet and grants bounded implementation authorization for cross-subsystem cryptographic integrity linkage.

Referenced artefacts:
- Implementation Authorization Packet: `docs/communications/EXT-CHAIN-INTEGRITY-01_IMPLEMENTATION_AUTHORIZATION_PACKET.md` (`e161a66`)
- Design-Lock Close Pack: `docs/communications/EXT-CHAIN-INTEGRITY-01_CLOSE_PACK.md` (`e53af52`)
- Assertion Document: `docs/communications/EXT-CHAIN-INTEGRITY-01_ASSERTION.md` (`d97b167`)
- Schema Design Pack: `docs/communications/EXT-CHAIN-INTEGRITY-01_SCHEMA_DESIGN_PACK.md` (`07c3fb1`)
- Rule Skeleton: `docs/governance/GOV-CHAIN-01_PGA_RULE_SKELETON.md` (`d3211d3`)
- Invariant Scaffolding Spec: `docs/communications/EXT-CHAIN-INTEGRITY-01_INVARIANT_TEST_SCAFFOLDING_SPEC.md` (`c957fe4`)

## 2. Authorization Grant (Bounded)

The Board authorizes implementation of the following scope only:
- write-once linkage persistence for payment/manifest/settlement integrity hashes,
- deterministic canonical settlement serialization,
- deterministic chain root computation,
- read-only verification utility output,
- invariant test implementation,
- controlled activation of `GOV-CHAIN-01` and CI governance gating.

No additional feature classes are authorized by this resolution.

## 3. Explicit Non-Authorized Surfaces

This resolution does not authorize:
- escrow or payout blocking,
- payment hold/freeze automation,
- authority overrides,
- runtime mutation endpoint expansion,
- historical rewrite/backfill mutation,
- cryptographic authority expansion beyond defined linkage scope.

Any request for these capabilities requires a separate extension phase and new board approval.

## 4. Activation Sequencing Conditions

Implementation and governance activation must follow this order:
1. Linkage fields + immutability guards
2. Canonical serializer + deterministic chain compute
3. Read-only verification utility
4. Invariant tests passing
5. `GOV-CHAIN-01` promotion from skeleton to active static rule
6. CI fail-gate activation for `GOV-CHAIN-01`
7. Registry/index updates
8. Implementation close pack and final ratification

Step skipping is prohibited.

## 5. Governance Determinations

The Board determines that this authorization:
- expands integrity assurance but not operational authority,
- preserves immutable-evidence doctrine,
- preserves binary CRITICAL fail posture for chain failures,
- remains controlled under formal change control.

## 6. Rollback Safety Conditions

If implementation defects occur, rollback must:
- revert `GOV-CHAIN-01` to skeleton/non-active mode,
- disable only the related CI fail-gate,
- retain persisted write-once evidence,
- avoid retroactive mutation or deletion of integrity records.

No rollback path may introduce authority escalation.

## 7. Approval Statement

The Board approves bounded implementation authorization for EXT-CHAIN-INTEGRITY-01 per this resolution and the referenced authorization packet.

Baseline authorization commit:
`e161a66`

## 8. Control Conditions

Any modification to authorization scope, deterministic formula, canonicalization doctrine, immutability doctrine, rule severity/weighting, or activation sequence requires:
- formal change request,
- document version increment,
- updated close pack,
- board re-ratification.

No exceptions.

## 9. Signature Block

Board Chair (or delegate): ____________________  
CTO / Engineering Authority: ____________________  
Compliance Lead: ____________________  
Date (UTC): ____________________
