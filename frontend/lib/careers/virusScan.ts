import fs from "fs/promises";
import path from "path";

const STORE_DIR = path.join(process.cwd(), "data", "careers");
const QUEUE_FILE = path.join(STORE_DIR, "virus-scan-queue.json");

interface ScanEntry {
  storageKey: string;
  queuedAt: string;
}

export async function queueVirusScan(storageKeys: string[]) {
  if (!storageKeys.length) return;
  await fs.mkdir(STORE_DIR, { recursive: true });
  let existing: ScanEntry[] = [];
  try {
    const raw = await fs.readFile(QUEUE_FILE, "utf8");
    existing = JSON.parse(raw) as ScanEntry[];
  } catch {
    existing = [];
  }
  const now = new Date().toISOString();
  const entries = storageKeys.map((key) => ({ storageKey: key, queuedAt: now }));
  await fs.writeFile(QUEUE_FILE, JSON.stringify(entries.concat(existing), null, 2));
}

