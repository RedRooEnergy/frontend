import crypto from "crypto";
import type { FreightAuditTriggerEvent } from "./FreightAuditRules";
import type { RunFreightAuditForEventOutcome } from "./FreightAuditService";
import {
  appendFreightExceptionEvidence,
  appendFreightExceptionEvents,
  appendFreightExceptionOverrides,
  applyFreightExceptionCaseProjection,
  createFreightExceptionCase,
  getFreightExceptionCase,
  listFreightExceptionCases,
  listFreightExceptionEvidence,
  listFreightExceptionEvents,
  listFreightExceptionOverrides,
  type AppendFreightExceptionEvidenceInput,
  type AppendFreightExceptionEventInput,
  type AppendFreightExceptionOverrideInput,
  type CreateFreightExceptionCaseInput,
  type FreightExceptionActorRole,
  type FreightExceptionCase,
  type FreightExceptionDecisionType,
  type FreightExceptionEvidence,
  type FreightExceptionEvent,
  type FreightExceptionEventType,
  type FreightExceptionOrigin,
  type FreightExceptionOverride,
  type FreightExceptionSeverity,
  type FreightExceptionStatus,
} from "./FreightExceptionStore";

export type FreightExceptionServiceDependencies = {
  now: () => Date;
  randomUUID: () => string;
  createCase: (input: CreateFreightExceptionCaseInput) => Promise<FreightExceptionCase>;
  appendEvents: (exceptionId: string, inputs: AppendFreightExceptionEventInput[]) => Promise<FreightExceptionEvent[]>;
  applyProjection: (input: {
    exceptionId: string;
    status?: FreightExceptionStatus;
    latestEventId: string;
    latestEventAtUtc: string;
    closedAtUtc?: string | null;
    updatedAtUtc?: string;
  }) => Promise<FreightExceptionCase>;
  appendEvidence: (exceptionId: string, inputs: AppendFreightExceptionEvidenceInput[]) => Promise<FreightExceptionEvidence[]>;
  appendOverrides: (exceptionId: string, inputs: AppendFreightExceptionOverrideInput[]) => Promise<FreightExceptionOverride[]>;
  getCase: (exceptionId: string) => Promise<FreightExceptionCase | null>;
  listCases: typeof listFreightExceptionCases;
  listEvents: (exceptionId: string) => Promise<FreightExceptionEvent[]>;
  listEvidence: (exceptionId: string) => Promise<FreightExceptionEvidence[]>;
  listOverrides: (exceptionId: string) => Promise<FreightExceptionOverride[]>;
};

const defaultDependencies: FreightExceptionServiceDependencies = {
  now: () => new Date(),
  randomUUID: () => crypto.randomUUID(),
  createCase: createFreightExceptionCase,
  appendEvents: appendFreightExceptionEvents,
  applyProjection: applyFreightExceptionCaseProjection,
  appendEvidence: appendFreightExceptionEvidence,
  appendOverrides: appendFreightExceptionOverrides,
  getCase: getFreightExceptionCase,
  listCases: listFreightExceptionCases,
  listEvents: listFreightExceptionEvents,
  listEvidence: listFreightExceptionEvidence,
  listOverrides: listFreightExceptionOverrides,
};

const ALLOWED_STATUS_TRANSITIONS: Record<FreightExceptionStatus, FreightExceptionStatus[]> = {
  OPEN: ["IN_REVIEW", "CLOSED"],
  IN_REVIEW: ["ACTION_REQUIRED", "RESOLVED"],
  ACTION_REQUIRED: ["IN_REVIEW"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

export type OpenCaseFromAuditOutcomeInput = {
  source: string;
  outcome: RunFreightAuditForEventOutcome;
  tenantId?: string | null;
  orderId?: string | null;
  shipmentId?: string | null;
  supplierId?: string | null;
  freightPartnerId?: string | null;
  openedByRole?: FreightExceptionActorRole;
  openedById?: string | null;
};

export type OpenCaseFromAuditOutcomeResult =
  | {
      opened: false;
      reason: "NO_EXCEPTION_TRIGGERED";
      outcomeStatus: RunFreightAuditForEventOutcome["status"];
    }
  | {
      opened: true;
      exceptionCase: FreightExceptionCase;
      openedEvent: FreightExceptionEvent;
    };

export type AppendCaseEventInput = {
  exceptionId: string;
  eventType: FreightExceptionEventType;
  toStatus?: FreightExceptionStatus;
  reasonCode?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  actorRole: FreightExceptionActorRole;
  actorId?: string | null;
  eventAtUtc?: string;
  idempotencyKey?: string;
  closedAtUtc?: string | null;
};

export type AppendCaseEvidenceItem = Omit<
  AppendFreightExceptionEvidenceInput,
  "exceptionId" | "evidenceId" | "capturedAtUtc" | "capturedByRole" | "capturedById" | "idempotencyKey"
> & {
  evidenceId?: string;
  capturedAtUtc?: string;
  capturedByRole?: FreightExceptionActorRole;
  capturedById?: string | null;
  idempotencyKey?: string;
};

export type AppendCaseEvidenceInput = {
  exceptionId: string;
  evidence: AppendCaseEvidenceItem[];
  actorRole?: FreightExceptionActorRole;
  actorId?: string | null;
};

export type RecordAdminDecisionInput = {
  exceptionId: string;
  decisionType: FreightExceptionDecisionType;
  approvalId: string;
  rationale: string;
  evidenceManifestHash: string;
  actorId: string;
  actorRole?: "admin" | "regulator";
  notes?: string | null;
  idempotencyKey?: string;
};

export type ResolveCaseInput = {
  exceptionId: string;
  actorId: string;
  actorRole?: FreightExceptionActorRole;
  resolutionCode: string;
  resolutionSummary: string;
};

export type CloseCaseInput = {
  exceptionId: string;
  actorId: string;
  actorRole?: FreightExceptionActorRole;
  note?: string;
  approvalId?: string;
  rationale?: string;
  evidenceManifestHash?: string;
};

export type CaseDetail = {
  exceptionCase: FreightExceptionCase;
  events: FreightExceptionEvent[];
  evidence: FreightExceptionEvidence[];
  overrides: FreightExceptionOverride[];
};

function resolveDependencies(overrides: Partial<FreightExceptionServiceDependencies> = {}): FreightExceptionServiceDependencies {
  return {
    ...defaultDependencies,
    ...overrides,
  };
}

function compactIso(isoUtc: string) {
  return isoUtc.replace(/[-:.TZ]/g, "");
}

function stableJoin(parts: Array<string | null | undefined>) {
  return parts.map((part) => String(part || "").trim()).join(":");
}

function sortKeys(input: any): any {
  if (Array.isArray(input)) return input.map(sortKeys);
  if (input && typeof input === "object") {
    return Object.keys(input)
      .sort()
      .reduce((acc: Record<string, unknown>, key) => {
        acc[key] = sortKeys((input as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return input;
}

function stableStringify(input: unknown) {
  return JSON.stringify(sortKeys(input));
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function makeExceptionId(nowUtc: string, randomUUID: () => string) {
  return `freight-exc-${compactIso(nowUtc)}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function makeEventId(nowUtc: string, randomUUID: () => string) {
  return `freight-exc-ev-${compactIso(nowUtc)}-${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function makeEvidenceId(nowUtc: string, randomUUID: () => string) {
  return `freight-exc-evd-${compactIso(nowUtc)}-${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function makeOverrideId(nowUtc: string, randomUUID: () => string) {
  return `freight-exc-ovr-${compactIso(nowUtc)}-${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function inferSeverity(outcome: RunFreightAuditForEventOutcome): FreightExceptionSeverity {
  if (outcome.status === "FAILED") return "HIGH";
  return outcome.summary.blockingFailures > 0 ? "CRITICAL" : "LOW";
}

function determineOpenReason(outcome: RunFreightAuditForEventOutcome) {
  if (outcome.status === "FAILED") {
    return {
      shouldOpen: true,
      reasonCode: "AUDIT_RUN_FAILED",
      failureSignature: stableJoin([outcome.errorCode, outcome.errorMessage]),
    };
  }
  if (outcome.summary.blockingFailures > 0) {
    return {
      shouldOpen: true,
      reasonCode: "AUDIT_BLOCKING_FAILURES",
      failureSignature: stableJoin([
        "blocking",
        String(outcome.summary.blockingFailures),
        String(outcome.summary.failedRules),
      ]),
    };
  }
  return {
    shouldOpen: false,
    reasonCode: "NO_EXCEPTION_TRIGGERED",
    failureSignature: "",
  };
}

function assertTransitionAllowed(from: FreightExceptionStatus, to: FreightExceptionStatus) {
  if (from === to) return;
  if (!ALLOWED_STATUS_TRANSITIONS[from].includes(to)) {
    throw new Error("FREIGHT_EXCEPTION_INVALID_TRANSITION");
  }
}

async function requireCase(
  exceptionId: string,
  deps: FreightExceptionServiceDependencies
): Promise<FreightExceptionCase> {
  const found = await deps.getCase(exceptionId);
  if (!found) throw new Error("FREIGHT_EXCEPTION_CASE_NOT_FOUND");
  return found;
}

async function appendCaseEventInternal(
  input: AppendCaseEventInput,
  deps: FreightExceptionServiceDependencies
): Promise<{ exceptionCase: FreightExceptionCase; event: FreightExceptionEvent }> {
  const existing = await requireCase(input.exceptionId, deps);
  const nextStatus = input.toStatus || existing.status;
  assertTransitionAllowed(existing.status, nextStatus);

  const eventAtUtc = input.eventAtUtc || deps.now().toISOString();
  const eventId = makeEventId(eventAtUtc, deps.randomUUID);
  const idempotencyKey =
    input.idempotencyKey ||
    stableJoin([input.exceptionId, input.eventType, existing.status, nextStatus, input.reasonCode, eventAtUtc]);

  const [event] = await deps.appendEvents(input.exceptionId, [
    {
      eventId,
      exceptionId: input.exceptionId,
      eventType: input.eventType,
      fromStatus: existing.status,
      toStatus: nextStatus,
      reasonCode: input.reasonCode || null,
      notes: input.notes || null,
      metadata: input.metadata,
      eventAtUtc,
      actorRole: input.actorRole,
      actorId: input.actorId || null,
      idempotencyKey,
    },
  ]);

  const projected = await deps.applyProjection({
    exceptionId: input.exceptionId,
    status: nextStatus,
    latestEventId: event.eventId,
    latestEventAtUtc: event.eventAtUtc,
    closedAtUtc: nextStatus === "CLOSED" ? input.closedAtUtc || event.eventAtUtc : undefined,
    updatedAtUtc: event.eventAtUtc,
  });

  return { exceptionCase: projected, event };
}

export async function openCaseFromAuditOutcome(
  input: OpenCaseFromAuditOutcomeInput,
  dependencyOverrides: Partial<FreightExceptionServiceDependencies> = {}
): Promise<OpenCaseFromAuditOutcomeResult> {
  const deps = resolveDependencies(dependencyOverrides);
  const openDecision = determineOpenReason(input.outcome);
  if (!openDecision.shouldOpen) {
    return {
      opened: false,
      reason: "NO_EXCEPTION_TRIGGERED",
      outcomeStatus: input.outcome.status,
    };
  }

  const nowUtc = deps.now().toISOString();
  const openedByRole = input.openedByRole || "system";
  const openedById = input.openedById || null;
  const exceptionId = makeExceptionId(nowUtc, deps.randomUUID);
  const linkedTriggerEvent = input.outcome.triggerEvent as FreightAuditTriggerEvent;
  const idempotencyKey = stableJoin([
    input.tenantId,
    input.orderId,
    input.shipmentId,
    linkedTriggerEvent,
    input.outcome.ruleSetVersion,
    openDecision.failureSignature,
  ]);

  const exceptionCase = await deps.createCase({
    exceptionId,
    tenantId: input.tenantId || null,
    orderId: input.orderId || (input.outcome.runId || null),
    shipmentId: input.shipmentId || null,
    supplierId: input.supplierId || null,
    freightPartnerId: input.freightPartnerId || null,
    status: "OPEN",
    severity: inferSeverity(input.outcome),
    origin: "AUDIT_AUTOMATED" as FreightExceptionOrigin,
    openedAtUtc: nowUtc,
    openedByRole,
    openedById,
    latestEventId: null,
    latestEventAtUtc: null,
    linkedAuditRunId: input.outcome.runId || null,
    linkedTriggerEvent,
    ruleSetVersion: input.outcome.ruleSetVersion,
    idempotencyKey,
    closedAtUtc: null,
  });

  const openedEventAtUtc = deps.now().toISOString();
  const [openedEvent] = await deps.appendEvents(exceptionCase.exceptionId, [
    {
      eventId: makeEventId(openedEventAtUtc, deps.randomUUID),
      exceptionId: exceptionCase.exceptionId,
      eventType: "CASE_OPENED",
      fromStatus: "OPEN",
      toStatus: "OPEN",
      reasonCode: openDecision.reasonCode,
      notes: input.outcome.status === "FAILED" ? input.outcome.errorMessage : "Blocking freight audit failures detected",
      metadata: {
        source: input.source,
        auditOutcomeStatus: input.outcome.status,
        triggerEvent: input.outcome.triggerEvent,
        ruleSetVersion: input.outcome.ruleSetVersion,
        summary:
          input.outcome.status === "COMPLETED"
            ? input.outcome.summary
            : { failedRules: null, blockingFailures: null, criticalFailures: null, totalRules: null },
      },
      eventAtUtc: openedEventAtUtc,
      actorRole: openedByRole,
      actorId: openedById,
      idempotencyKey: stableJoin([idempotencyKey, "CASE_OPENED"]),
    },
  ]);

  const projected = await deps.applyProjection({
    exceptionId: exceptionCase.exceptionId,
    status: "OPEN",
    latestEventId: openedEvent.eventId,
    latestEventAtUtc: openedEvent.eventAtUtc,
    updatedAtUtc: openedEvent.eventAtUtc,
  });

  return {
    opened: true,
    exceptionCase: projected,
    openedEvent,
  };
}

export async function appendCaseEvent(
  input: AppendCaseEventInput,
  dependencyOverrides: Partial<FreightExceptionServiceDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  return appendCaseEventInternal(input, deps);
}

export async function appendCaseEvidence(
  input: AppendCaseEvidenceInput,
  dependencyOverrides: Partial<FreightExceptionServiceDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  await requireCase(input.exceptionId, deps);
  const capturedAtUtc = deps.now().toISOString();
  const capturedByRole = input.actorRole || "system";
  const capturedById = input.actorId || null;

  const mapped = input.evidence.map((entry) => ({
    ...entry,
    evidenceId: entry.evidenceId || makeEvidenceId(capturedAtUtc, deps.randomUUID),
    exceptionId: input.exceptionId,
    capturedAtUtc: entry.capturedAtUtc || capturedAtUtc,
    capturedByRole: entry.capturedByRole || capturedByRole,
    capturedById: entry.capturedById ?? capturedById,
    idempotencyKey:
      entry.idempotencyKey ||
      stableJoin([
        input.exceptionId,
        entry.eventId,
        entry.evidenceCode,
        entry.referenceId,
        entry.contentHashSha256,
      ]),
  }));

  return deps.appendEvidence(input.exceptionId, mapped);
}

export async function recordAdminDecision(
  input: RecordAdminDecisionInput,
  dependencyOverrides: Partial<FreightExceptionServiceDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  const nowUtc = deps.now().toISOString();
  const actorRole = input.actorRole || "admin";
  const existing = await requireCase(input.exceptionId, deps);

  const overrideId = makeOverrideId(nowUtc, deps.randomUUID);
  const idempotencyKey =
    input.idempotencyKey ||
    stableJoin([input.exceptionId, input.decisionType, input.approvalId, input.evidenceManifestHash]);

  const [override] = await deps.appendOverrides(input.exceptionId, [
    {
      overrideId,
      exceptionId: input.exceptionId,
      decisionType: input.decisionType,
      approvalId: input.approvalId,
      rationale: input.rationale,
      evidenceManifestHash: input.evidenceManifestHash,
      relatedEventId: null,
      recordedAtUtc: nowUtc,
      recordedByRole: actorRole,
      recordedById: input.actorId,
      idempotencyKey,
    },
  ]);

  const decisionEvent = await appendCaseEventInternal(
    {
      exceptionId: input.exceptionId,
      eventType: "ADMIN_OVERRIDE_RECORDED",
      reasonCode: input.decisionType,
      notes: input.notes || input.rationale,
      metadata: {
        approvalId: input.approvalId,
        overrideId: override.overrideId,
        evidenceManifestHash: input.evidenceManifestHash,
      },
      actorRole,
      actorId: input.actorId,
      eventAtUtc: nowUtc,
      idempotencyKey: stableJoin([idempotencyKey, "ADMIN_OVERRIDE_RECORDED"]),
    },
    deps
  );

  if (input.decisionType === "MANUAL_CLOSE") {
    if (!["OPEN", "RESOLVED"].includes(existing.status)) {
      throw new Error("FREIGHT_EXCEPTION_INVALID_TRANSITION");
    }
    const closed = await appendCaseEventInternal(
      {
        exceptionId: input.exceptionId,
        eventType: "CASE_CLOSED",
        toStatus: "CLOSED",
        reasonCode: "MANUAL_CLOSE",
        notes: input.rationale,
        actorRole,
        actorId: input.actorId,
        eventAtUtc: deps.now().toISOString(),
        idempotencyKey: stableJoin([idempotencyKey, "CASE_CLOSED"]),
      },
      deps
    );
    return {
      override,
      decisionEvent: decisionEvent.event,
      closedEvent: closed.event,
      exceptionCase: closed.exceptionCase,
    };
  }

  return {
    override,
    decisionEvent: decisionEvent.event,
    closedEvent: null,
    exceptionCase: decisionEvent.exceptionCase,
  };
}

export async function resolveCase(
  input: ResolveCaseInput,
  dependencyOverrides: Partial<FreightExceptionServiceDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  const existing = await requireCase(input.exceptionId, deps);
  if (existing.status !== "IN_REVIEW") {
    throw new Error("FREIGHT_EXCEPTION_INVALID_TRANSITION");
  }
  return appendCaseEventInternal(
    {
      exceptionId: input.exceptionId,
      eventType: "CASE_RESOLVED",
      toStatus: "RESOLVED",
      reasonCode: input.resolutionCode,
      notes: input.resolutionSummary,
      actorRole: input.actorRole || "admin",
      actorId: input.actorId,
    },
    deps
  );
}

export async function closeCase(
  input: CloseCaseInput,
  dependencyOverrides: Partial<FreightExceptionServiceDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  const existing = await requireCase(input.exceptionId, deps);
  if (existing.status === "CLOSED") return { exceptionCase: existing, event: null as FreightExceptionEvent | null };

  if (existing.status === "OPEN") {
    if (!input.approvalId || !input.rationale?.trim()) {
      throw new Error("FREIGHT_EXCEPTION_APPROVAL_REQUIRED_FOR_OPEN_CLOSE");
    }
    const evidenceManifestHash = input.evidenceManifestHash || sha256Hex(input.rationale);
    const manualClose = await recordAdminDecision(
      {
        exceptionId: input.exceptionId,
        decisionType: "MANUAL_CLOSE",
        approvalId: input.approvalId,
        rationale: input.rationale,
        evidenceManifestHash,
        actorId: input.actorId,
        actorRole: input.actorRole === "regulator" ? "regulator" : "admin",
        notes: input.note || null,
      },
      deps
    );
    return { exceptionCase: manualClose.exceptionCase, event: manualClose.closedEvent };
  }

  if (existing.status !== "RESOLVED") {
    throw new Error("FREIGHT_EXCEPTION_INVALID_TRANSITION");
  }

  return appendCaseEventInternal(
    {
      exceptionId: input.exceptionId,
      eventType: "CASE_CLOSED",
      toStatus: "CLOSED",
      reasonCode: "CLOSED_AFTER_RESOLUTION",
      notes: input.note || null,
      actorRole: input.actorRole || "admin",
      actorId: input.actorId,
    },
    deps
  );
}

export async function listCases(
  filters: Parameters<FreightExceptionServiceDependencies["listCases"]>[0] = {},
  dependencyOverrides: Partial<FreightExceptionServiceDependencies> = {}
) {
  const deps = resolveDependencies(dependencyOverrides);
  return deps.listCases(filters);
}

export async function getCaseDetail(
  exceptionId: string,
  dependencyOverrides: Partial<FreightExceptionServiceDependencies> = {}
): Promise<CaseDetail> {
  const deps = resolveDependencies(dependencyOverrides);
  const [exceptionCase, events, evidence, overrides] = await Promise.all([
    deps.getCase(exceptionId),
    deps.listEvents(exceptionId),
    deps.listEvidence(exceptionId),
    deps.listOverrides(exceptionId),
  ]);

  if (!exceptionCase) throw new Error("FREIGHT_EXCEPTION_CASE_NOT_FOUND");
  return {
    exceptionCase,
    events,
    evidence,
    overrides,
  };
}

export async function exportCaseReplay(
  exceptionId: string,
  dependencyOverrides: Partial<FreightExceptionServiceDependencies> = {}
) {
  const detail = await getCaseDetail(exceptionId, dependencyOverrides);
  const generatedAtUtc = new Date().toISOString();

  const sortedEvents = detail.events
    .slice()
    .sort((a, b) => a.eventAtUtc.localeCompare(b.eventAtUtc) || a.eventId.localeCompare(b.eventId));
  const sortedEvidence = detail.evidence
    .slice()
    .sort((a, b) => a.capturedAtUtc.localeCompare(b.capturedAtUtc) || a.evidenceId.localeCompare(b.evidenceId));
  const sortedOverrides = detail.overrides
    .slice()
    .sort((a, b) => a.recordedAtUtc.localeCompare(b.recordedAtUtc) || a.overrideId.localeCompare(b.overrideId));

  const replayPayload = {
    generatedAtUtc,
    case: detail.exceptionCase,
    events: sortedEvents,
    evidence: sortedEvidence,
    overrides: sortedOverrides,
    counts: {
      events: sortedEvents.length,
      evidence: sortedEvidence.length,
      overrides: sortedOverrides.length,
    },
  };

  const manifestHashSha256 = sha256Hex(stableStringify(replayPayload));
  return {
    ...replayPayload,
    manifestHashSha256,
  };
}
