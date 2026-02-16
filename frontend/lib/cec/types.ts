export type CecProductType = "battery" | "inverter" | "pv_module";

export type CecApprovedProductRecord = {
  cecRecordId: string;
  productType: CecProductType;
  manufacturerName: string;
  brandName?: string;
  modelNumber: string;
  approvalStatus: string;
  approvalDate?: string;
  expiryDate?: string;
  sourceYear?: string;
  rawPayload: Record<string, unknown>;
  lastFetchedAt: string;
  dataHash: string;
};

export type CecSyncRun = {
  syncId: string;
  runAt: string;
  source: string;
  totalFetched: number;
  added: number;
  updated: number;
  expired: number;
  failed: boolean;
  errorMessage?: string;
};
