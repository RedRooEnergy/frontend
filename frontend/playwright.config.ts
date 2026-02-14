import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/admin-dashboard",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_ADMIN_PHASE: process.env.NEXT_PUBLIC_ADMIN_PHASE || "on",
      // Force in-memory admin stores for deterministic UI tests.
      MONGODB_URI: "",
    },
  },
});
