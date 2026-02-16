import fs from "fs/promises";
import path from "path";

const STORE_DIR = path.join(process.cwd(), "data", "careers");
const RATE_FILE = path.join(STORE_DIR, "rate-limit.json");

interface RateRecord {
  [ip: string]: number[];
}

async function readRates(): Promise<RateRecord> {
  try {
    const raw = await fs.readFile(RATE_FILE, "utf8");
    return JSON.parse(raw) as RateRecord;
  } catch {
    return {};
  }
}

async function writeRates(rates: RateRecord) {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(RATE_FILE, JSON.stringify(rates, null, 2));
}

export async function checkRateLimit(ip: string, windowMs = 15 * 60 * 1000, max = 10) {
  const now = Date.now();
  const rates = await readRates();
  const entries = (rates[ip] || []).filter((ts) => now - ts < windowMs);
  entries.push(now);
  rates[ip] = entries;
  await writeRates(rates);
  return { allowed: entries.length <= max, remaining: Math.max(0, max - entries.length) };
}

