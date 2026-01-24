import { Express } from "express";
import { loadEnv } from "../config/env";
import { createEnvSnapshot } from "../config/env-snapshot";

export function buildStartupContext() {
  const { env, port, serviceName } = loadEnv();

  const frozenEnv = createEnvSnapshot({
    env,
    port,
    serviceName,
  });

  return { env: frozenEnv };
}

export function installBaselineMiddleware(app: Express): void {
  app.disable("x-powered-by");
}

export function installStartupWatchdog(timeoutMs: number): NodeJS.Timeout {
  return setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error("[CORE] Startup watchdog triggered");
    process.exit(1);
  }, timeoutMs);
}
