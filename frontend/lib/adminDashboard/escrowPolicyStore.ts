import { createVersionedConfigStore, type VersionedConfigRecord } from "./versionedConfigCommon";

export type EscrowPolicyRules = {
  triggers?: {
    supplierRelease?: { requiresDeliveryConfirmed?: boolean; requiresCertificateIssued?: boolean };
    complianceRelease?: { requiresCertificateIssued?: boolean };
    freightRelease?: { requiresDeliveryConfirmed?: boolean };
  };
  holds?: {
    allowManualHold?: boolean;
    defaultHoldReasons?: string[];
    maxManualOverrideHours?: number;
  };
};

export type EscrowPolicyConfig = VersionedConfigRecord<EscrowPolicyRules>;

const store = createVersionedConfigStore<EscrowPolicyRules>({
  collectionName: "escrow_policies",
  configType: "ESCROW_POLICY",
  indexPrefix: "escrow_policy",
});

export const ensureEscrowPolicyIndexes = store.ensureIndexes;
export const getActiveEscrowPolicy = store.getActiveConfig;
export const createEscrowPolicyVersion = store.createNewVersion;
export const updateEscrowPolicyVersion = store.updateVersion;
