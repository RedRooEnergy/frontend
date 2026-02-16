import {
  dispatchFreightAuditLifecycleHook,
  runFreightAuditLifecycleHook,
} from "../../lib/freightAudit/FreightAuditLifecycleHooks";
import type { RunFreightAuditForEventOutcome } from "../../lib/freightAudit/FreightAuditService";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function makeLogger() {
  const logs = {
    info: [] as Array<{ message: string; data: Record<string, unknown> }>,
    warn: [] as Array<{ message: string; data: Record<string, unknown> }>,
    error: [] as Array<{ message: string; data: Record<string, unknown> }>,
  };

  return {
    logs,
    logger: {
      info(message: string, data: Record<string, unknown>) {
        logs.info.push({ message, data });
      },
      warn(message: string, data: Record<string, unknown>) {
        logs.warn.push({ message, data });
      },
      error(message: string, data: Record<string, unknown>) {
        logs.error.push({ message, data });
      },
    },
  };
}

function completedOutcome(blockingFailures = 0): RunFreightAuditForEventOutcome {
  return {
    status: "COMPLETED",
    runId: "freight-audit-20260212120000000-aaaaaaaaaaaa",
    triggerEvent: "DELIVERED",
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

async function testRunHookLogsCompletionAndWarning() {
  const { logger, logs } = makeLogger();
  let openCaseCalls = 0;
  const outcome = await runFreightAuditLifecycleHook(
    {
      source: "test.lifecycle",
      triggerEvent: "DELIVERED",
      orderId: "ORD-1",
      context: { orderId: "ORD-1" },
    },
    {
      logger,
      runAudit: async () => completedOutcome(1),
      isShadowGateEnabled: () => true,
      isShadowCaseOpenEnabled: () => true,
      openExceptionCase: async () => {
        openCaseCalls += 1;
        return {
          opened: true,
          exceptionCase: {
            exceptionId: "freight-exc-1",
            status: "OPEN",
            severity: "CRITICAL",
          } as any,
          openedEvent: { eventId: "freight-exc-ev-1" } as any,
        };
      },
    }
  );

  assert(outcome?.status === "COMPLETED", "Expected completed outcome");
  assert(openCaseCalls === 1, "Expected one exception open attempt");
  assert(
    logs.info.filter((entry) => entry.message === "freight_audit_hook_completed").length === 1,
    "Expected exactly one completion log"
  );
  assert(
    logs.info.some((entry) => entry.message === "freight_audit_shadow_gate_evaluated"),
    "Expected shadow gate evaluation log"
  );
  assert(logs.warn.some((entry) => entry.message === "freight_audit_hook_blocking_failures"), "Expected blocking warning log");
  assert(
    logs.warn.some((entry) => entry.message === "freight_audit_shadow_gate_case_opened"),
    "Expected shadow case-open warning log"
  );
  assert(logs.error.length === 0, "Did not expect error logs");
}

async function testRunHookLogsFailure() {
  const { logger, logs } = makeLogger();
  let openCaseCalls = 0;
  const outcome = await runFreightAuditLifecycleHook(
    {
      source: "test.lifecycle",
      triggerEvent: "BOOKED",
      orderId: "ORD-2",
      context: { orderId: "ORD-2" },
    },
    {
      logger,
      isShadowGateEnabled: () => true,
      isShadowCaseOpenEnabled: () => true,
      runAudit: async () => ({
        status: "FAILED",
        runId: "freight-audit-20260212120000000-bbbbbbbbbbbb",
        triggerEvent: "BOOKED",
        ruleSetVersion: "freight-audit-rules.v1.0.0",
        contextSnapshotHash: "b".repeat(64),
        errorCode: "MONGO_TIMEOUT",
        errorMessage: "Timed out",
      }),
      openExceptionCase: async () => {
        openCaseCalls += 1;
        return {
          opened: true,
          exceptionCase: {
            exceptionId: "freight-exc-2",
            status: "OPEN",
            severity: "HIGH",
          } as any,
          openedEvent: { eventId: "freight-exc-ev-2" } as any,
        };
      },
    }
  );

  assert(outcome?.status === "FAILED", "Expected failed outcome");
  assert(openCaseCalls === 1, "Expected one exception open attempt");
  assert(logs.error.some((entry) => entry.message === "freight_audit_hook_failed"), "Expected failure log");
  assert(
    logs.info.some((entry) => entry.message === "freight_audit_shadow_gate_evaluated"),
    "Expected shadow gate evaluation log"
  );
  assert(
    logs.warn.some((entry) => entry.message === "freight_audit_shadow_gate_case_opened"),
    "Expected shadow case-open warning log"
  );
}

async function testDispatchHookExecutes() {
  const { logger, logs } = makeLogger();
  let calls = 0;
  let openCaseCalls = 0;

  dispatchFreightAuditLifecycleHook(
    {
      source: "test.dispatch",
      triggerEvent: "ESCROW_ELIGIBLE",
      orderId: "ORD-3",
      context: { orderId: "ORD-3" },
    },
    {
      logger,
      isShadowGateEnabled: () => true,
      isShadowCaseOpenEnabled: () => false,
      runAudit: async () => {
        calls += 1;
        return completedOutcome(0);
      },
      openExceptionCase: async () => {
        openCaseCalls += 1;
        return {
          opened: false,
          reason: "NO_EXCEPTION_TRIGGERED",
          outcomeStatus: "COMPLETED",
        };
      },
    }
  );

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(calls === 1, "Expected one hook execution");
  assert(openCaseCalls === 0, "Did not expect exception open attempts for allow-only shadow decision");
  assert(logs.info.some((entry) => entry.message === "freight_audit_hook_completed"), "Expected completion log from dispatched hook");
  assert(
    logs.info.some((entry) => entry.message === "freight_audit_shadow_gate_evaluated"),
    "Expected shadow gate evaluation log from dispatched hook"
  );
  assert(
    logs.info.some((entry) => entry.message === "freight_audit_shadow_gate_allow_only"),
    "Expected allow-only shadow gate log from dispatched hook"
  );
}

async function testCaseOpenFailureDoesNotThrow() {
  const { logger, logs } = makeLogger();
  const outcome = await runFreightAuditLifecycleHook(
    {
      source: "test.lifecycle",
      triggerEvent: "ESCROW_ELIGIBLE",
      orderId: "ORD-4",
      context: { orderId: "ORD-4" },
    },
    {
      logger,
      isShadowGateEnabled: () => true,
      isShadowCaseOpenEnabled: () => true,
      runAudit: async () => completedOutcome(1),
      openExceptionCase: async () => {
        throw new Error("mongo unavailable");
      },
    }
  );

  assert(outcome?.status === "COMPLETED", "Expected completed outcome even when case open fails");
  assert(
    logs.error.some((entry) => entry.message === "freight_audit_shadow_gate_case_open_failed"),
    "Expected case-open failure log"
  );
}

async function testWouldBlockDoesNotOpenCaseWhenCaseOpenFlagDisabled() {
  const { logger, logs } = makeLogger();
  let openCaseCalls = 0;
  const outcome = await runFreightAuditLifecycleHook(
    {
      source: "test.lifecycle",
      triggerEvent: "ESCROW_ELIGIBLE",
      orderId: "ORD-5",
      context: { orderId: "ORD-5" },
    },
    {
      logger,
      isShadowGateEnabled: () => true,
      isShadowCaseOpenEnabled: () => false,
      runAudit: async () => completedOutcome(1),
      openExceptionCase: async () => {
        openCaseCalls += 1;
        return {
          opened: true,
          exceptionCase: {
            exceptionId: "freight-exc-3",
            status: "OPEN",
            severity: "CRITICAL",
          } as any,
          openedEvent: { eventId: "freight-exc-ev-3" } as any,
        };
      },
    }
  );

  assert(outcome?.status === "COMPLETED", "Expected completed outcome");
  assert(openCaseCalls === 0, "Did not expect case-open attempt when case-open flag disabled");
  assert(
    logs.info.some((entry) => entry.message === "freight_audit_shadow_gate_case_open_disabled"),
    "Expected case-open disabled log"
  );
}

async function testShadowGateDisabledSkipsShadowLoggingAndCaseOpen() {
  const { logger, logs } = makeLogger();
  let openCaseCalls = 0;
  const outcome = await runFreightAuditLifecycleHook(
    {
      source: "test.lifecycle",
      triggerEvent: "BOOKED",
      orderId: "ORD-6",
      context: { orderId: "ORD-6" },
    },
    {
      logger,
      isShadowGateEnabled: () => false,
      isShadowCaseOpenEnabled: () => true,
      runAudit: async () => completedOutcome(1),
      openExceptionCase: async () => {
        openCaseCalls += 1;
        return {
          opened: true,
          exceptionCase: {
            exceptionId: "freight-exc-4",
            status: "OPEN",
            severity: "CRITICAL",
          } as any,
          openedEvent: { eventId: "freight-exc-ev-4" } as any,
        };
      },
    }
  );

  assert(outcome?.status === "COMPLETED", "Expected completed outcome");
  assert(openCaseCalls === 0, "Did not expect case-open attempt when shadow gate disabled");
  assert(
    logs.info.every((entry) => !entry.message.startsWith("freight_audit_shadow_gate_")),
    "Did not expect shadow gate logs when shadow gate disabled"
  );
}

async function run() {
  await testRunHookLogsCompletionAndWarning();
  await testRunHookLogsFailure();
  await testDispatchHookExecutes();
  await testCaseOpenFailureDoesNotThrow();
  await testWouldBlockDoesNotOpenCaseWhenCaseOpenFlagDisabled();
  await testShadowGateDisabledSkipsShadowLoggingAndCaseOpen();
}

run();
