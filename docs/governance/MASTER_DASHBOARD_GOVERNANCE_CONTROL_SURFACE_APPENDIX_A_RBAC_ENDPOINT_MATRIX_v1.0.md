# MASTER DASHBOARD GOVERNANCE CONTROL SURFACE — APPENDIX A
## RBAC and Endpoint Mutation Allow-List Matrix v1.0

Document ID: RRE-MASTER-DASHBOARD-GOV-SPEC-APPENDIX-A-v1.0  
Version: v1.0  
Status: DRAFT  
Classification: Governance Inheritance Appendix  
Runtime Authorization: NOT GRANTED

## 1) Closed Role Set

Runtime role keys currently recognized in repository control surfaces:
- `admin`
- `buyer`
- `supplier`
- `regulator`
- `freight`
- `service-partner`
- `system`

Governance designation roles (dashboard policy layer) that must map to runtime authorization groups before activation:
- `executive`
- `board-observer`
- `auditor`
- `installer-ops`
- `insurance-ops`
- `accreditation-officer`

No role outside this closed set is authorized by this appendix.

## 2) Endpoint Inventory Template (Mandatory)

| Dashboard | Endpoint | Method | Allowed Roles | Allowed Mutation Entity Types | Prohibited Entity Types | Approval Requirement | Required Fields |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `[dashboard]` | `[path]` | `[GET/POST/PATCH/...]` | `[roles]` | `[entity classes or NONE]` | `[entity classes]` | `[NONE/SINGLE/DUAL]` | `[justification, requestId, incidentId?, ...]` |

All dashboard implementations must publish this inventory. Unlisted endpoints are non-compliant by default.

## 3) CEO / Executive Dashboard Matrix

| Endpoint | Method | Allowed Roles | Allowed Mutation Entity Types | Prohibited Entity Types | Approval Requirement | Required Fields |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/governance/platform/status` | `GET` | `executive`, `board-observer`, `auditor` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/governance/platform/badge` | `GET` | `executive`, `board-observer`, `auditor` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/governance/chatbot/status` | `GET` | `executive`, `board-observer`, `auditor` | `NONE` | `ALL` | `NONE` | `N/A` |

## 4) Grand-Master Dashboard Matrix

| Endpoint | Method | Allowed Roles | Allowed Mutation Entity Types | Prohibited Entity Types | Approval Requirement | Required Fields |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/admin/dashboard/overview` | `GET` | `admin` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/admin/dashboard/financial/config` | `GET` | `admin` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/admin/dashboard/financial/config` | `POST` | `admin` | `PlatformFeeConfig`, `FxPolicy`, `EscrowPolicy` | `PricingSnapshot`, `EscrowReleaseExecution`, `RBACRoleKey` | `SINGLE` | `justification`, `requestId` (`correlationId` alias accepted) |
| `/api/admin/dashboard/financial/holds` | `GET` | `admin` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/admin/dashboard/financial/holds` | `POST` | `admin` | `SettlementHold` | `PricingSnapshot`, `EscrowReleaseExecution` | `SINGLE` | `justification`, `requestId`, `scope`, `subsystem` |
| `/api/admin/dashboard/financial/holds/:holdId/override` | `POST` | `admin` | `SettlementHoldOverride` | `EscrowReleaseExecution`, `PricingSnapshot`, `CorePolicyBypass` | `DUAL` | `justification`, `requestId`, `incidentId`, `durationHours?` |
| `/api/admin/dashboard/governance/status` | `GET` | `admin` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/admin/dashboard/governance/change-control` | `GET` | `admin` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/admin/dashboard/governance/change-control` | `POST` | `admin` | `ChangeControlEvent` | `RuntimePermissionGrant`, `CoreBypassToggle` | `SINGLE` | `justification`, `requestId`, `rationale`, `type` |
| `/api/admin/dashboard/governance/run-audit` | `POST` | `admin` | `GovernanceAuditRunRequest` | `EnforcementActivation`, `RBACExpansion` | `SINGLE` | `justification`, `requestId` |

## 5) Installer Dashboard Matrix

| Endpoint | Method | Allowed Roles | Allowed Mutation Entity Types | Prohibited Entity Types | Approval Requirement | Required Fields |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/installer/work-orders` | `GET` | `installer-ops` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/installer/work-orders/:id/status` | `PATCH` | `installer-ops` | `InstallationMilestoneStatus` | `OrderFinancialSettlement`, `EscrowReleaseExecution`, `PricingSnapshot` | `SINGLE` | `justification`, `requestId`, `workOrderId` |
| `/api/installer/work-orders/:id/evidence` | `POST` | `installer-ops` | `InstallationEvidenceRef` | `ComplianceOverride`, `PayoutExecution` | `SINGLE` | `justification`, `requestId`, `artefactHash` |

## 6) Freight Dashboard Matrix

| Endpoint | Method | Allowed Roles | Allowed Mutation Entity Types | Prohibited Entity Types | Approval Requirement | Required Fields |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/freight/delivery-confirm` | `POST` | `freight` | `DeliveryConfirmation` | `EscrowReleaseExecution`, `PricingSnapshotLinkage` | `SINGLE` | `justification`, `requestId`, `orderId`, `deliveryEvidenceRef` |
| `/api/admin/freight-settlement-holds` | `GET` | `admin`, `freight`, `regulator` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/admin/freight-settlement-holds/:holdId` | `GET` | `admin`, `freight`, `regulator` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/admin/freight-settlement-holds/:holdId/override` | `POST` | `admin`, `regulator` | `FreightSettlementHoldOverride` | `EscrowReleaseExecution`, `PricingSnapshotMutation` | `DUAL` | `justification`, `requestId`, `incidentId`, `holdId` |

## 7) Insurance Dashboard Matrix

| Endpoint | Method | Allowed Roles | Allowed Mutation Entity Types | Prohibited Entity Types | Approval Requirement | Required Fields |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/insurance/claims` | `GET` | `insurance-ops`, `auditor` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/insurance/claims/:id/status` | `PATCH` | `insurance-ops` | `InsuranceClaimStatus` | `RefundExecution`, `PayoutExecution`, `EscrowReleaseExecution` | `SINGLE` | `justification`, `requestId`, `claimId` |
| `/api/insurance/claims/:id/evidence` | `POST` | `insurance-ops` | `InsuranceEvidenceRef` | `FinancialLedgerMutation` | `SINGLE` | `justification`, `requestId`, `artefactHash` |
| `/api/insurance/claims/:id/recommendation` | `POST` | `insurance-ops` | `PayoutRecommendation` | `PayoutExecution`, `RefundExecution` | `SINGLE` | `justification`, `requestId`, `incidentId` |

## 8) Accreditation / Compliance Dashboard Matrix

| Endpoint | Method | Allowed Roles | Allowed Mutation Entity Types | Prohibited Entity Types | Approval Requirement | Required Fields |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/admin/compliance-partners` | `GET` | `admin`, `accreditation-officer`, `regulator` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/admin/compliance-partners/:partnerId/status` | `POST`/`PATCH` | `admin`, `accreditation-officer` | `CompliancePartnerStatus` | `CoreComplianceBypass`, `CertificateForceApproveWithoutPolicy` | `SINGLE` | `justification`, `requestId`, `partnerId` |
| `/api/admin/cec/status` | `GET` | `admin`, `accreditation-officer`, `regulator` | `NONE` | `ALL` | `NONE` | `N/A` |
| `/api/admin/cec/sync` | `POST` | `admin`, `accreditation-officer` | `CertificationSyncOperation` | `CertificateBypassDecision` | `SINGLE` | `justification`, `requestId`, `incidentId` |

## 9) Compliance Rule

Any mutation endpoint not declared in this appendix is considered unauthorized and fails governance evaluation by default.
