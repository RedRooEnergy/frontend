import crypto from "crypto";

type ResetEntry = {
  codeHash: string;
  expiresAt: number;
};

const TTL_MS = 15 * 60 * 1000;
const store = new Map<string, ResetEntry>();

function key(email: string) {
  return email.toLowerCase();
}

function hashCode(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createPasswordResetCode(email: string) {
  const code = String(crypto.randomInt(10000000, 99999999));
  store.set(key(email), { codeHash: hashCode(code), expiresAt: Date.now() + TTL_MS });
  return { code, expiresAt: Date.now() + TTL_MS };
}

export function verifyPasswordResetCode(email: string, code: string) {
  const entry = store.get(key(email));
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(key(email));
    return false;
  }
  const ok = hashCode(code) === entry.codeHash;
  if (ok) store.delete(key(email));
  return ok;
}
