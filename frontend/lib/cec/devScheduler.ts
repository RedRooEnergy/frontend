import { syncCecSources } from "./sync";
import { getCecSyncSchedule, setCecSyncSchedule, updateCecSyncScheduleRun } from "./schedule";

type CecSchedulerState = {
  intervalId?: NodeJS.Timeout | null;
  intervalHours: number;
  lastRunAt?: string | null;
  lastResult?: { syncId?: string; failed?: boolean } | null;
  enabled: boolean;
  initPromise?: Promise<void> | null;
};

const globalForScheduler = globalThis as typeof globalThis & { __cecScheduler?: CecSchedulerState };

function getState(): CecSchedulerState {
  if (!globalForScheduler.__cecScheduler) {
    globalForScheduler.__cecScheduler = {
      intervalId: null,
      intervalHours: 24,
      enabled: false,
      lastRunAt: null,
      lastResult: null,
      initPromise: null,
    };
  }
  return globalForScheduler.__cecScheduler;
}

async function ensureInitialized() {
  const state = getState();
  if (state.initPromise) return state.initPromise;
  state.initPromise = (async () => {
    try {
      await syncWithSchedule();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[cec-sync] schedule init failed", err);
    }
  })();
  return state.initPromise;
}

async function syncWithSchedule() {
  const state = getState();
  const schedule = await getCecSyncSchedule();
  const shouldEnable = Boolean(schedule.enabled);
  state.intervalHours = Number(schedule.intervalHours) || 24;
  state.lastRunAt = schedule.lastRunAt || null;
  state.lastResult = schedule.lastResult || null;

  if (shouldEnable && !state.intervalId) {
    startInterval(state.intervalHours);
  }
  if (!shouldEnable && state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.enabled = shouldEnable;
}

function startInterval(hours: number) {
  const state = getState();
  if (state.intervalId) return;
  const intervalMs = Math.max(1, hours) * 60 * 60 * 1000;
  state.intervalId = setInterval(async () => {
    try {
      const result = await syncCecSources();
      const lastRunAt = new Date().toISOString();
      const lastResult = { syncId: result.syncId, failed: false };
      state.lastRunAt = lastRunAt;
      state.lastResult = lastResult;
      await updateCecSyncScheduleRun({ lastRunAt, lastResult });
      // eslint-disable-next-line no-console
      console.log("[cec-sync] completed", result.syncId);
    } catch (err) {
      const lastRunAt = new Date().toISOString();
      const lastResult = { syncId: undefined, failed: true };
      state.lastRunAt = lastRunAt;
      state.lastResult = lastResult;
      try {
        await updateCecSyncScheduleRun({ lastRunAt, lastResult });
      } catch {
        // ignore update failures
      }
      // eslint-disable-next-line no-console
      console.error("[cec-sync] failed", err);
      // swallow errors; sync run logging handled inside syncCecSources
    }
  }, intervalMs);
  state.enabled = true;
}

export async function getCecSchedulerStatus() {
  await ensureInitialized();
  await syncWithSchedule();
  const state = getState();
  return {
    enabled: state.enabled,
    intervalHours: state.intervalHours,
    lastRunAt: state.lastRunAt,
    lastResult: state.lastResult ?? null,
  };
}

export async function startCecScheduler(intervalHours = 24, updatedBy?: string) {
  await ensureInitialized();
  const state = getState();
  state.intervalHours = intervalHours;
  await setCecSyncSchedule({ enabled: true, intervalHours, updatedBy: updatedBy || null });
  startInterval(intervalHours);
  return getCecSchedulerStatus();
}

export async function stopCecScheduler(updatedBy?: string) {
  await ensureInitialized();
  const state = getState();
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.enabled = false;
  await setCecSyncSchedule({ enabled: false, intervalHours: state.intervalHours, updatedBy: updatedBy || null });
  return getCecSchedulerStatus();
}

// Dev-only bootstrap (Mongo required)
if (process.env.NODE_ENV === "development" && process.env.MONGODB_URI) {
  void ensureInitialized();
}
