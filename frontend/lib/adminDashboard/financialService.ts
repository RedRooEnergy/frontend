import { writeAdminAudit, type AdminAuditRecord } from "./auditWriter";
import {
  createPlatformFeeConfigVersion,
  getActivePlatformFeeConfig,
  type PlatformFeeRules,
} from "./platformFeeConfigStore";
import { createFxPolicyVersion, getActiveFxPolicy, type FxPolicyRules } from "./fxPolicyStore";
import {
  createEscrowPolicyVersion,
  getActiveEscrowPolicy,
  type EscrowPolicyRules,
} from "./escrowPolicyStore";
import {
  createSettlementHold,
  getSettlementHoldById,
  overrideSettlementHold,
  type FinancialHoldSubsystem,
} from "./settlementHoldStore";

export class FinancialAdminError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type AdminActor = {
  actorId: string;
  actorRole: string;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

function requiredReason(reason: string) {
  const normalized = String(reason || "").trim();
  if (!normalized) {
    throw new FinancialAdminError("ADMIN_REASON_REQUIRED", "reason is required", 400);
  }
  return normalized;
}

function normalizeTenantId(input?: string | null) {
  return String(input || "platform").trim() || "platform";
}

function enforceEscrowCoreInvariants(rules: EscrowPolicyRules) {
  const supplierDelivery = rules?.triggers?.supplierRelease?.requiresDeliveryConfirmed;
  const supplierCertificate = rules?.triggers?.supplierRelease?.requiresCertificateIssued;
  const complianceCertificate = rules?.triggers?.complianceRelease?.requiresCertificateIssued;
  const freightDelivery = rules?.triggers?.freightRelease?.requiresDeliveryConfirmed;

  if (supplierDelivery === false) {
    throw new FinancialAdminError(
      "CORE_ESCROW_INVARIANT_VIOLATION",
      "supplierRelease.requiresDeliveryConfirmed cannot be disabled",
      400
    );
  }
  if (supplierCertificate === false) {
    throw new FinancialAdminError(
      "CORE_ESCROW_INVARIANT_VIOLATION",
      "supplierRelease.requiresCertificateIssued cannot be disabled",
      400
    );
  }
  if (complianceCertificate === false) {
    throw new FinancialAdminError(
      "CORE_ESCROW_INVARIANT_VIOLATION",
      "complianceRelease.requiresCertificateIssued cannot be disabled",
      400
    );
  }
  if (freightDelivery === false) {
    throw new FinancialAdminError(
      "CORE_ESCROW_INVARIANT_VIOLATION",
      "freightRelease.requiresDeliveryConfirmed cannot be disabled",
      400
    );
  }
}

export async function getFinancialConfig(input: { tenantId?: string | null } = {}) {
  const tenantId = normalizeTenantId(input.tenantId);
  const [feeConfig, fxPolicy, escrowPolicy] = await Promise.all([
    getActivePlatformFeeConfig(tenantId),
    getActiveFxPolicy(tenantId),
    getActiveEscrowPolicy(tenantId),
  ]);

  return {
    tenantId,
    feeConfig: feeConfig || null,
    fxPolicy: fxPolicy || null,
    escrowPolicy: escrowPolicy || null,
  };
}

async function writeConfigAudit(input: {
  actor: AdminActor;
  action: string;
  entityType: string;
  entityId: string;
  reason: string;
  before: unknown;
  after: unknown;
  correlationId?: string | null;
  tenantId: string;
}): Promise<AdminAuditRecord> {
  return writeAdminAudit({
    actor: input.actor,
    action: input.action,
    entity: {
      type: input.entityType,
      id: input.entityId,
    },
    reason: input.reason,
    before: input.before,
    after: input.after,
    correlationId: input.correlationId || null,
    tenantId: input.tenantId,
  });
}

export async function updateFinancialConfig(input: {
  actor: AdminActor;
  tenantId?: string | null;
  reason: string;
  feeConfig?: PlatformFeeRules;
  fxPolicy?: FxPolicyRules;
  escrowPolicy?: EscrowPolicyRules;
  effectiveFrom?: string | null;
  correlationId?: string | null;
}) {
  const reason = requiredReason(input.reason);
  const tenantId = normalizeTenantId(input.tenantId);
  const effectiveFrom = String(input.effectiveFrom || "").trim() || null;

  const updates = {
    feeConfig: input.feeConfig && typeof input.feeConfig === "object" ? input.feeConfig : null,
    fxPolicy: input.fxPolicy && typeof input.fxPolicy === "object" ? input.fxPolicy : null,
    escrowPolicy: input.escrowPolicy && typeof input.escrowPolicy === "object" ? input.escrowPolicy : null,
  };

  if (!updates.feeConfig && !updates.fxPolicy && !updates.escrowPolicy) {
    throw new FinancialAdminError("ADMIN_CONFIG_EMPTY_UPDATE", "At least one config payload is required", 400);
  }

  if (updates.escrowPolicy) enforceEscrowCoreInvariants(updates.escrowPolicy);

  const resultRows: Array<{
    type: "feeConfig" | "fxPolicy" | "escrowPolicy";
    version: number;
    hash: string;
    auditId: string;
    configId: string;
  }> = [];

  if (updates.feeConfig) {
    const before = await getActivePlatformFeeConfig(tenantId);
    const audit = await writeConfigAudit({
      actor: input.actor,
      action: "ADMIN_FINANCIAL_FEE_CONFIG_UPDATED",
      entityType: "PLATFORM_FEE_CONFIG",
      entityId: tenantId,
      reason,
      before: before || null,
      after: updates.feeConfig,
      correlationId: input.correlationId || null,
      tenantId,
    });
    const created = await createPlatformFeeConfigVersion({
      tenantId,
      createdBy: { userId: input.actor.actorId, role: input.actor.actorRole },
      reason,
      rules: updates.feeConfig,
      effectiveFrom,
      auditId: audit.auditId,
    });
    resultRows.push({
      type: "feeConfig",
      version: created.version,
      hash: created.canonicalHash,
      auditId: audit.auditId,
      configId: created.configId,
    });
  }

  if (updates.fxPolicy) {
    const before = await getActiveFxPolicy(tenantId);
    const audit = await writeConfigAudit({
      actor: input.actor,
      action: "ADMIN_FINANCIAL_FX_POLICY_UPDATED",
      entityType: "FX_POLICY",
      entityId: tenantId,
      reason,
      before: before || null,
      after: updates.fxPolicy,
      correlationId: input.correlationId || null,
      tenantId,
    });
    const created = await createFxPolicyVersion({
      tenantId,
      createdBy: { userId: input.actor.actorId, role: input.actor.actorRole },
      reason,
      rules: updates.fxPolicy,
      effectiveFrom,
      auditId: audit.auditId,
    });
    resultRows.push({
      type: "fxPolicy",
      version: created.version,
      hash: created.canonicalHash,
      auditId: audit.auditId,
      configId: created.configId,
    });
  }

  if (updates.escrowPolicy) {
    const before = await getActiveEscrowPolicy(tenantId);
    const audit = await writeConfigAudit({
      actor: input.actor,
      action: "ADMIN_FINANCIAL_ESCROW_POLICY_UPDATED",
      entityType: "ESCROW_POLICY",
      entityId: tenantId,
      reason,
      before: before || null,
      after: updates.escrowPolicy,
      correlationId: input.correlationId || null,
      tenantId,
    });
    const created = await createEscrowPolicyVersion({
      tenantId,
      createdBy: { userId: input.actor.actorId, role: input.actor.actorRole },
      reason,
      rules: updates.escrowPolicy,
      effectiveFrom,
      auditId: audit.auditId,
    });
    resultRows.push({
      type: "escrowPolicy",
      version: created.version,
      hash: created.canonicalHash,
      auditId: audit.auditId,
      configId: created.configId,
    });
  }

  return {
    ok: true,
    tenantId,
    updates: resultRows,
  };
}

function parseSubsystem(input: string): FinancialHoldSubsystem {
  const normalized = String(input || "").trim().toUpperCase();
  if (normalized === "PAYMENTS") return "PAYMENTS";
  if (normalized === "FREIGHT") return "FREIGHT";
  if (normalized === "COMPLIANCE") return "COMPLIANCE";
  if (normalized === "RISK") return "RISK";
  throw new FinancialAdminError("ADMIN_FINANCIAL_INVALID_SUBSYSTEM", "subsystem must be PAYMENTS, FREIGHT, COMPLIANCE or RISK", 400);
}

function normalizeScope(input: {
  orderId?: string;
  paymentId?: string;
  payoutId?: string;
  supplierId?: string;
}) {
  return {
    orderId: String(input.orderId || "").trim() || null,
    paymentId: String(input.paymentId || "").trim() || null,
    payoutId: String(input.payoutId || "").trim() || null,
    supplierId: String(input.supplierId || "").trim() || null,
  };
}

export async function createFinancialHold(input: {
  actor: AdminActor;
  tenantId?: string | null;
  scope: {
    orderId?: string;
    paymentId?: string;
    payoutId?: string;
    supplierId?: string;
  };
  subsystem: string;
  reason: string;
  reasonCode?: string | null;
  correlationId?: string | null;
}) {
  const reason = requiredReason(input.reason);
  const tenantId = normalizeTenantId(input.tenantId);
  const scope = normalizeScope(input.scope || {});
  const subsystem = parseSubsystem(input.subsystem);

  const audit = await writeAdminAudit({
    actor: input.actor,
    action: "ADMIN_FINANCIAL_HOLD_CREATED",
    entity: {
      type: "SETTLEMENT_HOLD",
      id: `${tenantId}:${scope.orderId || scope.paymentId || scope.payoutId || scope.supplierId || "scope"}`,
    },
    reason,
    before: null,
    after: {
      tenantId,
      scope,
      subsystem,
      reasonCode: input.reasonCode || null,
    },
    correlationId: input.correlationId || null,
    tenantId,
  });

  const hold = await createSettlementHold({
    tenantId,
    scope,
    subsystem,
    reason,
    reasonCode: input.reasonCode || null,
    createdBy: { userId: input.actor.actorId, role: input.actor.actorRole },
    auditId: audit.auditId,
  });

  return {
    ok: true,
    hold,
    auditId: audit.auditId,
    entityId: hold.holdId,
  };
}

export async function overrideFinancialHold(input: {
  actor: AdminActor;
  holdId: string;
  reason: string;
  justification: string;
  durationHours?: number | null;
  correlationId?: string | null;
}) {
  const holdId = String(input.holdId || "").trim();
  if (!holdId) throw new FinancialAdminError("ADMIN_FINANCIAL_HOLD_ID_REQUIRED", "holdId is required", 400);
  const reason = requiredReason(input.reason);
  const justification = String(input.justification || "").trim();
  if (!justification) {
    throw new FinancialAdminError("ADMIN_FINANCIAL_OVERRIDE_JUSTIFICATION_REQUIRED", "justification is required", 400);
  }

  const existing = await getSettlementHoldById(holdId);
  if (!existing) {
    throw new FinancialAdminError("ADMIN_FINANCIAL_HOLD_NOT_FOUND", "hold not found", 404);
  }

  const audit = await writeAdminAudit({
    actor: input.actor,
    action: "ADMIN_FINANCIAL_HOLD_OVERRIDDEN",
    entity: {
      type: "SETTLEMENT_HOLD",
      id: holdId,
    },
    reason,
    before: existing,
    after: {
      ...existing,
      status: "OVERRIDDEN",
      override: {
        justification,
        durationHours: input.durationHours ?? null,
      },
    },
    correlationId: input.correlationId || null,
    tenantId: existing.tenantId || null,
  });

  const hold = await overrideSettlementHold({
    holdId,
    reason,
    justification,
    durationHours: input.durationHours ?? null,
    actor: { userId: input.actor.actorId, role: input.actor.actorRole },
    auditId: audit.auditId,
  });

  if (!hold) throw new FinancialAdminError("ADMIN_FINANCIAL_HOLD_OVERRIDE_FAILED", "hold override failed", 500);

  return {
    ok: true,
    hold,
    auditId: audit.auditId,
    entityId: hold.holdId,
  };
}
