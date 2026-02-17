import dotenv from "dotenv";

dotenv.config();

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("INVALID_PORT");
  }
  return parsed;
}

function parsePositiveInt(value: string | undefined, fallback: number, label: string): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`INVALID_${label}`);
  }
  return parsed;
}

function parseNonNegativeInt(value: string | undefined, fallback: number, label: string): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`INVALID_${label}`);
  }
  return parsed;
}

export const env = {
  port: parsePort(process.env.PORT, 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  mongoDbName: process.env.MONGODB_DB_NAME || "redroo_backend",
  dbStartupTimeoutMs: parsePositiveInt(process.env.DB_STARTUP_TIMEOUT_MS, 15000, "DB_STARTUP_TIMEOUT_MS"),
  paymentsTestAutoSucceedMs: parseNonNegativeInt(
    process.env.PAYMENTS_TEST_AUTO_SUCCEED_MS,
    0,
    "PAYMENTS_TEST_AUTO_SUCCEED_MS",
  ),
};
