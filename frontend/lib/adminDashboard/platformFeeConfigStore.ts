import { createVersionedConfigStore, type VersionedConfigRecord } from "./versionedConfigCommon";

export type PlatformFeeRules = {
  supplierCommission?: Array<{ categoryId?: string; tier?: string; percent?: number }>;
  buyerServiceFee?: { mode?: "flat" | "percent" | "hybrid"; flatAUD?: number; percent?: number; capAUD?: number };
  freightMargin?: { mode?: "flat" | "percent" | "hybrid"; percent?: number; minAUD?: number; maxAUD?: number };
  complianceProcessingFee?: { perOrderAUD?: number; perItemAUD?: number };
  installerReferralFee?: { mode?: "flat" | "percent"; valueAUD?: number; percent?: number };
  insuranceAddOnMargin?: { percent?: number; flatAUD?: number };
};

export type PlatformFeeConfig = VersionedConfigRecord<PlatformFeeRules>;

const store = createVersionedConfigStore<PlatformFeeRules>({
  collectionName: "platform_fee_configs",
  configType: "PLATFORM_FEE_CONFIG",
  indexPrefix: "platform_fee_config",
});

export const ensurePlatformFeeConfigIndexes = store.ensureIndexes;
export const getActivePlatformFeeConfig = store.getActiveConfig;
export const createPlatformFeeConfigVersion = store.createNewVersion;
export const updatePlatformFeeConfigVersion = store.updateVersion;
