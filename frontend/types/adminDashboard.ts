export type AdminAuditReceipt = {
  auditId: string;
  entityId?: string;
  version?: number;
  hash?: string;
  type?: string;
};

export type AdminConfigVersion = {
  configId?: string;
  version: number;
  status: "ACTIVE" | "RETIRED";
  effectiveFrom: string;
  createdAt: string;
  canonicalHash: string;
  reason?: string;
  rules: Record<string, unknown>;
};

export type FinancialConfigResponse = {
  tenantId: string;
  feeConfig: AdminConfigVersion | null;
  fxPolicy: AdminConfigVersion | null;
  escrowPolicy: AdminConfigVersion | null;
};

export type FinancialConfigUpdatePayload = {
  reason: string;
  tenantId?: string;
  effectiveFrom?: string;
  correlationId?: string;
  feeConfig?: Record<string, unknown>;
  fxPolicy?: Record<string, unknown>;
  escrowPolicy?: Record<string, unknown>;
};

export type FinancialConfigUpdateResponse = {
  ok: boolean;
  tenantId: string;
  updates: Array<{
    type: "feeConfig" | "fxPolicy" | "escrowPolicy";
    version: number;
    hash: string;
    auditId: string;
    configId: string;
  }>;
};

export type SettlementHold = {
  holdId: string;
  tenantId: string;
  scope: {
    orderId?: string | null;
    paymentId?: string | null;
    payoutId?: string | null;
    supplierId?: string | null;
  };
  subsystem: "PAYMENTS" | "FREIGHT" | "COMPLIANCE" | "RISK";
  reason: string;
  reasonCode?: string | null;
  status: "ACTIVE" | "OVERRIDDEN" | "RELEASED";
  createdAt: string;
  updatedAt: string;
  auditId: string;
  override?: {
    overriddenAt: string;
    overriddenBy: { userId: string; role: string };
    justification: string;
    durationHours?: number | null;
  } | null;
};

export type ListHoldsResponse = {
  holds: SettlementHold[];
  total: number;
};

export type CreateHoldPayload = {
  reason: string;
  reasonCode?: string;
  tenantId?: string;
  correlationId?: string;
  subsystem: "PAYMENTS" | "FREIGHT" | "COMPLIANCE" | "RISK";
  scope: {
    orderId?: string;
    paymentId?: string;
    payoutId?: string;
    supplierId?: string;
  };
};

export type CreateHoldResponse = {
  ok: boolean;
  hold: SettlementHold;
  auditId: string;
  entityId: string;
};

export type OverrideHoldPayload = {
  reason: string;
  justification: string;
  durationHours?: number;
  correlationId?: string;
};

export type OverrideHoldResponse = {
  ok: boolean;
  hold: SettlementHold;
  auditId: string;
  entityId: string;
};

export type GovernanceCheck = {
  id: string;
  status: "PASS" | "FAIL" | "NO_DATA";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  notes?: string[];
  evidence?: string[];
  impactSurface?: string;
};

export type GovernanceStatusResponse = {
  generatedAt?: string;
  generatedAtUtc?: string;
  overall: "PASS" | "FAIL" | "NO_DATA";
  badgeState: "GREEN" | "DEGRADED" | "NO_DATA" | "PASS" | "REGRESSION" | "IMPROVING";
  governanceScore:
    | number
    | {
        basePercent: number;
        deductions: Array<{ id: string; percent: number }>;
        finalPercent: number;
      };
  deductions?: Array<{ ruleId: string; value: number }>;
  trendStatus?: string;
  summary: {
    totalSubsystems: number;
    passCount: number;
    failCount: number;
    noDataCount: number;
  };
  governanceChecks: GovernanceCheck[];
};

export type ChangeControlEvent = {
  changeControlId: string;
  type: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "IMPLEMENTED";
  rationale: string;
  reason: string;
  tenantId: string;
  createdAt: string;
  auditId: string;
  scope: {
    entityType?: string | null;
    entityId?: string | null;
  };
  impactAssessment: {
    riskLevel: "LOW" | "MED" | "HIGH";
    rollbackPlan: string;
    affectedParties: string[];
  };
};

export type ListChangeControlsResponse = {
  items: ChangeControlEvent[];
  total: number;
};

export type CreateChangeControlPayload = {
  reason: string;
  rationale: string;
  type: string;
  tenantId?: string;
  correlationId?: string;
  scope?: {
    entityType?: string;
    entityId?: string;
  };
  impactAssessment?: {
    riskLevel?: "LOW" | "MED" | "HIGH";
    rollbackPlan?: string;
    affectedParties?: string[];
  };
};

export type CreateChangeControlResponse = {
  ok: boolean;
  entityId: string;
  auditId: string;
  event: ChangeControlEvent;
};

export type RunAuditPayload = {
  reason: string;
  tenantId?: string;
  correlationId?: string;
};

export type RunAuditResponse = {
  ok: boolean;
  status: "NOT_IMPLEMENTED";
  message: string;
  runId: string | null;
  auditId: string;
};
