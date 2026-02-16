import crypto from "crypto";
import type { CecApprovedProductRecord, CecProductType, CecSyncRun } from "./types";
import { computeDataHash, markExpired, recordSyncRun, upsertCecRecord } from "./store";

type SyncResult = {
  totalFetched: number;
  added: number;
  updated: number;
  expired: number;
};

type CecFetchSource = {
  name: string;
  productType: CecProductType;
  url: string;
};

const DEFAULT_SOURCES: CecFetchSource[] = [
  {
    name: "cec-battery-current",
    productType: "battery",
    url: "https://CleanEnergyCouncil1325.jitterbit.cc/production/1.0/batteryListing?Year=Current",
  },
];

function stableHash(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function fetchWithRetry(url: string, options: RequestInit = {}, attempts = 3) {
  let lastError: Error | null = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`CEC fetch failed (${response.status})`);
        }
        throw new Error(`CEC fetch retryable (${response.status})`);
      }
      return response.json();
    } catch (error: any) {
      lastError = error;
      const delay = Math.min(5000 * Math.pow(3, i), 45000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error("CEC fetch failed");
}

function normalizeRecord(source: CecFetchSource, item: Record<string, any>): CecApprovedProductRecord {
  const rawPayload = item ?? {};
  const cecRecordId = String(item?.RecordID || item?.recordId || item?.id || stableHash(JSON.stringify(rawPayload)));
  const manufacturerName = String(item?.Manufacturer || item?.manufacturer || item?.Brand || "");
  const modelNumber = String(item?.Model || item?.model || item?.ModelNumber || "");

  return {
    cecRecordId,
    productType: source.productType,
    manufacturerName,
    brandName: item?.Brand || item?.brand || undefined,
    modelNumber,
    approvalStatus: String(item?.Status || item?.status || "APPROVED"),
    approvalDate: item?.ApprovalDate || item?.approvalDate || undefined,
    expiryDate: item?.ExpiryDate || item?.expiryDate || undefined,
    sourceYear: item?.Year || item?.year || undefined,
    rawPayload,
    lastFetchedAt: new Date().toISOString(),
    dataHash: computeDataHash(rawPayload),
  };
}

export async function syncCecSources(sources: CecFetchSource[] = DEFAULT_SOURCES) {
  const start = Date.now();
  let totalFetched = 0;
  let added = 0;
  let updated = 0;
  let expired = 0;

  try {
    for (const source of sources) {
      const payload = await fetchWithRetry(source.url, {
        headers: {
          Accept: "application/json",
        },
      });
      const items = Array.isArray(payload) ? payload : payload?.items || payload?.data || [];
      totalFetched += items.length;
      const seenIds: string[] = [];

      for (const item of items) {
        const record = normalizeRecord(source, item);
        seenIds.push(record.cecRecordId);
        await upsertCecRecord(record);
        if (record.dataHash) updated += 1;
      }

      // Skeleton: if the API provides full set, we can mark missing as expired.
      // markExpired would need the previous list to diff; stubbed here for future use.
      if (seenIds.length === 0) {
        expired += 0;
      }
    }

    const run: CecSyncRun = {
      syncId: `cec_${Date.now()}`,
      runAt: new Date().toISOString(),
      source: sources.map((s) => s.name).join(","),
      totalFetched,
      added,
      updated,
      expired,
      failed: false,
    };
    await recordSyncRun(run);
    return { ...run, durationMs: Date.now() - start };
  } catch (error: any) {
    const run: CecSyncRun = {
      syncId: `cec_${Date.now()}`,
      runAt: new Date().toISOString(),
      source: sources.map((s) => s.name).join(","),
      totalFetched,
      added,
      updated,
      expired,
      failed: true,
      errorMessage: error?.message || "CEC sync failed",
    };
    await recordSyncRun(run);
    throw error;
  }
}

export const cecSources = DEFAULT_SOURCES;
