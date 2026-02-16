import fs from "fs/promises";
import path from "path";

const STORE_DIR = path.join(process.cwd(), "data", "careers");
const OUTBOX_FILE = path.join(STORE_DIR, "email-outbox.json");

interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  createdAt: string;
}

async function writeOutbox(message: EmailMessage) {
  await fs.mkdir(STORE_DIR, { recursive: true });
  let existing: EmailMessage[] = [];
  try {
    const raw = await fs.readFile(OUTBOX_FILE, "utf8");
    existing = JSON.parse(raw) as EmailMessage[];
  } catch {
    existing = [];
  }
  existing.unshift(message);
  await fs.writeFile(OUTBOX_FILE, JSON.stringify(existing, null, 2));
}

async function sendViaWebhook(message: EmailMessage) {
  const webhook = process.env.CAREERS_EMAIL_WEBHOOK_URL;
  if (!webhook) return false;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return true;
  } catch {
    return false;
  }
}

export async function notifyApplicant(to: string, referenceId: string) {
  const message: EmailMessage = {
    to,
    subject: "Your RedRooEnergy application has been received",
    body: `Thanks for applying. Your reference ID is ${referenceId}. We will review your application and contact you if there is a match.`,
    createdAt: new Date().toISOString(),
  };
  const sent = await sendViaWebhook(message);
  if (!sent) await writeOutbox(message);
}

export async function notifyAdmin(to: string, referenceId: string, roleLabel: string) {
  const message: EmailMessage = {
    to,
    subject: `New career application received (${referenceId})`,
    body: `A new application has been submitted for ${roleLabel}. Reference ID: ${referenceId}.`,
    createdAt: new Date().toISOString(),
  };
  const sent = await sendViaWebhook(message);
  if (!sent) await writeOutbox(message);
}

