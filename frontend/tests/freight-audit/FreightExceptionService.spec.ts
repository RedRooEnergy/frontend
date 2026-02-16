import {
  appendCaseEvent,
  closeCase,
  exportCaseReplay,
  getCaseDetail,
  listCases,
  openCaseFromAuditOutcome,
  recordAdminDecision,
  resolveCase,
  type FreightExceptionServiceDependencies,
} from "../../lib/freightAudit/FreightExceptionService";
import type {
  FreightExceptionCase,
  FreightExceptionEvidence,
  FreightExceptionEvent,
  FreightExceptionOverride,
} from "../../lib/freightAudit/FreightExceptionStore";
import type { RunFreightAuditForEventOutcome } from "../../lib/freightAudit/FreightAuditService";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function makeMemoryDeps() {
  const cases = new Map<string, FreightExceptionCase>();
  const events = new Map<string, FreightExceptionEvent[]>();
  const evidence = new Map<string, FreightExceptionEvidence[]>();
  const overrides = new Map<string, FreightExceptionOverride[]>();

  const nowValues = [
    new Date("2026-02-12T12:00:00.000Z"),
    new Date("2026-02-12T12:00:01.000Z"),
    new Date("2026-02-12T12:00:02.000Z"),
    new Date("2026-02-12T12:00:03.000Z"),
    new Date("2026-02-12T12:00:04.000Z"),
  ];
  let nowIndex = 0;
  let uuidCounter = 0;

  const deps: Partial<FreightExceptionServiceDependencies> = {
    now: () => nowValues[Math.min(nowIndex++, nowValues.length - 1)],
    randomUUID: () => {
      const prefix = String(uuidCounter++).padStart(12, "0");
      return `${prefix.slice(0, 8)}-${prefix.slice(0, 4)}-aaaa-bbbb-cccccccccccc`;
    },
    createCase: async (input) => {
      const existing = Array.from(cases.values()).find((entry) => entry.idempotencyKey === input.idempotencyKey);
      if (existing) return existing;
      const record: FreightExceptionCase = {
        ...input,
        _id: input.exceptionId,
        createdAt: "2026-02-12T12:00:00.000Z",
        updatedAt: "2026-02-12T12:00:00.000Z",
      };
      cases.set(record.exceptionId, record);
      return record;
    },
    appendEvents: async (exceptionId, inputs) => {
      const list = events.get(exceptionId) || [];
      const out: FreightExceptionEvent[] = [];
      for (const input of inputs) {
        const existing = list.find((entry) => entry.idempotencyKey === input.idempotencyKey);
        if (existing) {
          out.push(existing);
          continue;
        }
        const record: FreightExceptionEvent = {
          ...input,
          _id: input.eventId,
          createdAt: input.eventAtUtc,
        };
        list.push(record);
        out.push(record);
      }
      events.set(exceptionId, list);
      return out;
    },
    applyProjection: async (input) => {
      const existing = cases.get(input.exceptionId);
      if (!existing) throw new Error("FREIGHT_EXCEPTION_CASE_NOT_FOUND");
      const next: FreightExceptionCase = {
        ...existing,
        status: input.status || existing.status,
        latestEventId: input.latestEventId,
        latestEventAtUtc: input.latestEventAtUtc,
        closedAtUtc: Object.prototype.hasOwnProperty.call(input, "closedAtUtc")
          ? input.closedAtUtc || null
          : existing.closedAtUtc || null,
        updatedAt: input.updatedAtUtc || existing.updatedAt,
      };
      cases.set(input.exceptionId, next);
      return next;
    },
    appendEvidence: async (exceptionId, inputs) => {
      const list = evidence.get(exceptionId) || [];
      const out: FreightExceptionEvidence[] = [];
      for (const input of inputs) {
        const existing = list.find((entry) => entry.idempotencyKey === input.idempotencyKey);
        if (existing) {
          out.push(existing);
          continue;
        }
        const record: FreightExceptionEvidence = {
          ...input,
          _id: input.evidenceId,
          createdAt: input.capturedAtUtc,
        };
        list.push(record);
        out.push(record);
      }
      evidence.set(exceptionId, list);
      return out;
    },
    appendOverrides: async (exceptionId, inputs) => {
      const list = overrides.get(exceptionId) || [];
      const out: FreightExceptionOverride[] = [];
      for (const input of inputs) {
        const existing = list.find((entry) => entry.idempotencyKey === input.idempotencyKey);
        if (existing) {
          out.push(existing);
          continue;
        }
        const record: FreightExceptionOverride = {
          ...input,
          _id: input.overrideId,
          createdAt: input.recordedAtUtc,
        };
        list.push(record);
        out.push(record);
      }
      overrides.set(exceptionId, list);
      return out;
    },
    getCase: async (exceptionId) => cases.get(exceptionId) || null,
    listCases: async (filters = {}) => {
      const all = Array.from(cases.values());
      return all.filter((entry) => {
        if (filters.status && entry.status !== filters.status) return false;
        if (filters.orderId && entry.orderId !== filters.orderId) return false;
        return true;
      });
    },
    listEvents: async (exceptionId) => (events.get(exceptionId) || []).slice(),
    listEvidence: async (exceptionId) => (evidence.get(exceptionId) || []).slice(),
    listOverrides: async (exceptionId) => (overrides.get(exceptionId) || []).slice(),
  };

  return { deps, cases, events, evidence, overrides };
}

function completedOutcome(blockingFailures: number): RunFreightAuditForEventOutcome {
  return {
    status: "COMPLETED",
    runId: "freight-audit-20260212120000000-111111111111",
    triggerEvent: "ESCROW_ELIGIBLE",
    ruleSetVersion: "freight-audit-rules.v1.0.0",
    contextSnapshotHash: "a".repeat(64),
    startedAtUtc: "2026-02-12T12:00:00.000Z",
    closedAtUtc: "2026-02-12T12:00:01.000Z",
    summary: {
      totalRules: 2,
      failedRules: blockingFailures > 0 ? 1 : 0,
      criticalFailures: blockingFailures > 0 ? 1 : 0,
      blockingFailures,
    },
    persistedResultCount: 2,
    persistedEvidenceCount: 0,
  };
}

async function testOpenCaseFromBlockingOutcome() {
  const { deps } = makeMemoryDeps();
  const result = await openCaseFromAuditOutcome(
    {
      source: "test",
      outcome: completedOutcome(1),
      orderId: "ORD-1",
      shipmentId: "SHP-1",
      openedByRole: "system",
      openedById: "svc",
    },
    deps
  );

  assert(result.opened === true, "Expected opened case");
  if (result.opened !== true) throw new Error("Expected opened result");
  assert(result.exceptionCase.status === "OPEN", "Expected OPEN status");
  assert(result.exceptionCase.severity === "CRITICAL", "Expected CRITICAL severity");
  assert(result.openedEvent.eventType === "CASE_OPENED", "Expected CASE_OPENED event");
}

async function testNoCaseForNonBlockingOutcome() {
  const { deps } = makeMemoryDeps();
  const result = await openCaseFromAuditOutcome(
    {
      source: "test",
      outcome: completedOutcome(0),
      orderId: "ORD-2",
    },
    deps
  );
  assert(result.opened === false, "Expected no case open");
}

async function testTransitionAndResolutionFlow() {
  const { deps } = makeMemoryDeps();
  const opened = await openCaseFromAuditOutcome(
    {
      source: "test",
      outcome: {
        status: "FAILED",
        runId: "freight-audit-20260212120000000-222222222222",
        triggerEvent: "DELIVERED",
        ruleSetVersion: "freight-audit-rules.v1.0.0",
        contextSnapshotHash: "b".repeat(64),
        errorCode: "RESULT_WRITE_FAILED",
        errorMessage: "Write failed",
      },
      orderId: "ORD-3",
      shipmentId: "SHP-3",
    },
    deps
  );
  if (!opened.opened) throw new Error("Expected case opened");

  const toReview = await appendCaseEvent(
    {
      exceptionId: opened.exceptionCase.exceptionId,
      eventType: "STATUS_CHANGED",
      toStatus: "IN_REVIEW",
      reasonCode: "TRIAGE_STARTED",
      actorRole: "admin",
      actorId: "admin-1",
    },
    deps
  );
  assert(toReview.exceptionCase.status === "IN_REVIEW", "Expected IN_REVIEW status");

  const resolved = await resolveCase(
    {
      exceptionId: opened.exceptionCase.exceptionId,
      actorId: "admin-1",
      resolutionCode: "EVIDENCE_VALIDATED",
      resolutionSummary: "Evidence package validated by admin.",
    },
    deps
  );
  assert(resolved.exceptionCase.status === "RESOLVED", "Expected RESOLVED status");

  const closed = await closeCase(
    {
      exceptionId: opened.exceptionCase.exceptionId,
      actorId: "admin-1",
      note: "Closed after resolution",
    },
    deps
  );
  assert(closed.exceptionCase.status === "CLOSED", "Expected CLOSED status");
}

async function testManualCloseRequiresApproval() {
  const { deps } = makeMemoryDeps();
  const opened = await openCaseFromAuditOutcome(
    {
      source: "test",
      outcome: {
        status: "FAILED",
        runId: "freight-audit-20260212120000000-333333333333",
        triggerEvent: "BOOKED",
        ruleSetVersion: "freight-audit-rules.v1.0.0",
        contextSnapshotHash: "c".repeat(64),
        errorCode: "MONGODB_UNAVAILABLE",
        errorMessage: "Down",
      },
      orderId: "ORD-4",
    },
    deps
  );
  if (!opened.opened) throw new Error("Expected case opened");

  let threw = false;
  try {
    await closeCase(
      {
        exceptionId: opened.exceptionCase.exceptionId,
        actorId: "admin-1",
      },
      deps
    );
  } catch (error: any) {
    threw = true;
    assert(
      String(error?.message || "") === "FREIGHT_EXCEPTION_APPROVAL_REQUIRED_FOR_OPEN_CLOSE",
      "Expected approval required error"
    );
  }
  assert(threw, "Expected closeCase to reject OPEN->CLOSED without approval");

  const decided = await recordAdminDecision(
    {
      exceptionId: opened.exceptionCase.exceptionId,
      decisionType: "MANUAL_CLOSE",
      approvalId: "APP-001",
      rationale: "Emergency close approved by admin board.",
      evidenceManifestHash: "d".repeat(64),
      actorId: "admin-1",
    },
    deps
  );
  assert(decided.exceptionCase.status === "CLOSED", "Expected closed case after manual close decision");
}

async function testDetailListAndReplay() {
  const { deps } = makeMemoryDeps();
  const opened = await openCaseFromAuditOutcome(
    {
      source: "test",
      outcome: {
        status: "FAILED",
        runId: "freight-audit-20260212120000000-444444444444",
        triggerEvent: "CUSTOMS_CLEARED",
        ruleSetVersion: "freight-audit-rules.v1.0.0",
        contextSnapshotHash: "e".repeat(64),
        errorCode: "FAIL",
        errorMessage: "Fail",
      },
      orderId: "ORD-5",
      shipmentId: "SHP-5",
    },
    deps
  );
  if (!opened.opened) throw new Error("Expected case opened");

  await appendCaseEvent(
    {
      exceptionId: opened.exceptionCase.exceptionId,
      eventType: "ASSIGNED",
      toStatus: "IN_REVIEW",
      reasonCode: "ASSIGNED_ADMIN",
      actorRole: "admin",
      actorId: "admin-1",
      metadata: { ownerId: "admin-1" },
    },
    deps
  );

  const listed = await listCases({ orderId: "ORD-5" }, deps);
  assert(listed.length === 1, "Expected listCases filter to return one case");

  const detail = await getCaseDetail(opened.exceptionCase.exceptionId, deps);
  assert(detail.events.length >= 2, "Expected case detail events");

  const replay = await exportCaseReplay(opened.exceptionCase.exceptionId, deps);
  assert(!!replay.manifestHashSha256, "Expected replay manifest hash");
  assert(replay.case.exceptionId === opened.exceptionCase.exceptionId, "Replay case mismatch");
}

async function run() {
  await testOpenCaseFromBlockingOutcome();
  await testNoCaseForNonBlockingOutcome();
  await testTransitionAndResolutionFlow();
  await testManualCloseRequiresApproval();
  await testDetailListAndReplay();
}

run();
