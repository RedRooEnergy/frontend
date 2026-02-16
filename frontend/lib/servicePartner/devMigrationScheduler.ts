import {
  migrateServicePartnerJson,
  recordMigrationRun,
  getMigrationSchedule,
  setMigrationSchedule,
  updateMigrationScheduleRun,
} from "./migration.js";

type SchedulerState = {
  intervalId?: NodeJS.Timeout | null;
  enabled: boolean;
  intervalHours: number;
  lastRunAt?: string;
  lastResult?: { migrationId?: string; dryRun?: boolean } | null;
  initPromise?: Promise<void> | null;
};

const globalForScheduler = globalThis as typeof globalThis & { __spMigrationScheduler?: SchedulerState };

function getState(): SchedulerState {
  if (!globalForScheduler.__spMigrationScheduler) {
    globalForScheduler.__spMigrationScheduler = {
      enabled: false,
      intervalId: null,
      intervalHours: 24,
      lastResult: null,
      initPromise: null,
    };
  }
  return globalForScheduler.__spMigrationScheduler;
}

async function ensureInitialized() {
  const state = getState();
  if (state.initPromise) return state.initPromise;
  state.initPromise = (async () => {
    try {
      await syncWithSchedule();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[dev-migration] schedule init failed", err);
    }
  })();
  return state.initPromise;
}

async function syncWithSchedule() {
  const state = getState();
  const schedule = await getMigrationSchedule();
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

function startInterval(intervalHours: number) {
  const state = getState();
  if (state.intervalId) return;

  const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;
  state.intervalId = setInterval(async () => {
    try {
      const { migrationId, results } = await migrateServicePartnerJson({ dryRun: false });
      const runId = migrationId || `scheduled_${Date.now()}`;
      const lastRunAt = new Date().toISOString();
      const lastResult = { migrationId: runId, dryRun: false };
      state.lastRunAt = lastRunAt;
      state.lastResult = lastResult;

      await recordMigrationRun({
        migrationId: runId,
        dryRun: false,
        mode: "SCHEDULED",
        results,
        actorId: "system",
        actorRole: "system",
        trigger: "scheduled",
      });
      await updateMigrationScheduleRun({ lastRunAt, lastResult });
      // eslint-disable-next-line no-console
      console.log("[dev-migration] completed", runId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[dev-migration] failed", err);
    }
  }, intervalMs);
}

export async function getSchedulerStatus() {
  await ensureInitialized();
  await syncWithSchedule();
  const state = getState();
  return {
    enabled: state.enabled,
    intervalHours: state.intervalHours,
    lastRunAt: state.lastRunAt || null,
    lastResult: state.lastResult || null,
  };
}

export async function startScheduler(updatedBy?: string) {
  await ensureInitialized();
  const state = getState();
  if (state.enabled) return getSchedulerStatus();
  await setMigrationSchedule({ enabled: true, intervalHours: state.intervalHours, updatedBy: updatedBy || null });
  return getSchedulerStatus();
}

export async function stopScheduler(updatedBy?: string) {
  await ensureInitialized();
  const state = getState();
  await setMigrationSchedule({ enabled: false, intervalHours: state.intervalHours, updatedBy: updatedBy || null });
  return getSchedulerStatus();
}

// initialise from persistent schedule on first load (dev-only, Mongo required)
if (process.env.NODE_ENV === "development" && process.env.MONGODB_URI) {
  void ensureInitialized();
}
