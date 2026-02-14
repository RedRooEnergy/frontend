import { createVersionedConfigStore, type VersionedConfigRecord } from "./versionedConfigCommon";

export type FxPolicyRules = {
  baseCurrency?: string;
  settlementCurrency?: string;
  fxSource?: "WISE" | "MANUAL" | "OTHER";
  spreadBps?: number;
  maxManualOverrideBps?: number;
  rounding?: { mode?: "bankers" | "ceil" | "floor"; decimals?: number };
  maxAgeSeconds?: number;
  allowPerProductOverride?: boolean;
};

export type FxPolicyConfig = VersionedConfigRecord<FxPolicyRules>;

const store = createVersionedConfigStore<FxPolicyRules>({
  collectionName: "fx_policies",
  configType: "FX_POLICY",
  indexPrefix: "fx_policy",
});

export const ensureFxPolicyIndexes = store.ensureIndexes;
export const getActiveFxPolicy = store.getActiveConfig;
export const createFxPolicyVersion = store.createNewVersion;
export const updateFxPolicyVersion = store.updateVersion;
