"use client";

import { getAdminAuthHeaders } from "../auth/clientAdminHeaders";
import type {
  CreateChangeControlPayload,
  CreateChangeControlResponse,
  CreateHoldPayload,
  CreateHoldResponse,
  FinancialConfigResponse,
  FinancialConfigUpdatePayload,
  FinancialConfigUpdateResponse,
  GovernanceStatusResponse,
  ListChangeControlsResponse,
  ListHoldsResponse,
  OverrideHoldPayload,
  OverrideHoldResponse,
  RunAuditPayload,
  RunAuditResponse,
} from "../../types/adminDashboard";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...getAdminAuthHeaders(),
  };

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export function getFinancialConfig() {
  return requestJson<FinancialConfigResponse>("/api/admin/dashboard/financial/config");
}

export function updateFinancialConfig(payload: FinancialConfigUpdatePayload) {
  return requestJson<FinancialConfigUpdateResponse>("/api/admin/dashboard/financial/config", {
    method: "POST",
    body: payload,
  });
}

export function listFinancialHolds() {
  return requestJson<ListHoldsResponse>("/api/admin/dashboard/financial/holds");
}

export function createFinancialHold(payload: CreateHoldPayload) {
  return requestJson<CreateHoldResponse>("/api/admin/dashboard/financial/holds", {
    method: "POST",
    body: payload,
  });
}

export function overrideFinancialHold(holdId: string, payload: OverrideHoldPayload) {
  return requestJson<OverrideHoldResponse>(`/api/admin/dashboard/financial/holds/${encodeURIComponent(holdId)}/override`, {
    method: "POST",
    body: payload,
  });
}

export function getGovernanceStatus() {
  return requestJson<GovernanceStatusResponse>("/api/admin/dashboard/governance/status");
}

export function listGovernanceChangeControls() {
  return requestJson<ListChangeControlsResponse>("/api/admin/dashboard/governance/change-control");
}

export function createGovernanceChangeControl(payload: CreateChangeControlPayload) {
  return requestJson<CreateChangeControlResponse>("/api/admin/dashboard/governance/change-control", {
    method: "POST",
    body: payload,
  });
}

export function runGovernanceAudit(payload: RunAuditPayload) {
  return (async () => {
    const headers: Record<string, string> = {
      ...getAdminAuthHeaders(),
      "content-type": "application/json",
    };

    const response = await fetch("/api/admin/dashboard/governance/run-audit", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const json = (await response.json().catch(() => ({}))) as RunAuditResponse & { error?: string };
    if (!response.ok && response.status !== 501) {
      throw new Error(typeof json.error === "string" ? json.error : `Request failed (${response.status})`);
    }
    return json as RunAuditResponse;
  })();
}
