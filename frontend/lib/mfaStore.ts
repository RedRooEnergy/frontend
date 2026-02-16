import crypto from "crypto";

type MfaEntry = {
  emailHash: string;
  smsHash: string;
  expiresAt: number;
  attemptsLeft: number;
  email: string;
  role: string;
  phone: string;
};

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const store = new Map<string, MfaEntry>();

function key(email: string, role: string) {
  return `${role}:${email.toLowerCase()}`;
}

function hashCode(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createMfaChallenge(email: string, role: string, phone: string) {
  const emailCode = String(crypto.randomInt(10000000, 99999999));
  const smsCode = String(crypto.randomInt(100000, 999999));
  const entry: MfaEntry = {
    emailHash: hashCode(emailCode),
    smsHash: hashCode(smsCode),
    expiresAt: Date.now() + TTL_MS,
    attemptsLeft: MAX_ATTEMPTS,
    email,
    role,
    phone,
  };
  store.set(key(email, role), entry);
  return { emailCode, smsCode, expiresAt: entry.expiresAt };
}

export function verifyMfaChallenge(
  email: string,
  role: string,
  emailCode: string,
  smsCode: string
) {
  const entry = store.get(key(email, role));
  if (!entry) return { ok: false, error: "No active verification challenge." };
  if (Date.now() > entry.expiresAt) {
    store.delete(key(email, role));
    return { ok: false, error: "Verification codes expired. Request new codes." };
  }
  if (entry.attemptsLeft <= 0) {
    store.delete(key(email, role));
    return { ok: false, error: "Too many attempts. Request new codes." };
  }
  const emailOk = hashCode(emailCode) === entry.emailHash;
  const smsOk = hashCode(smsCode) === entry.smsHash;
  if (!emailOk || !smsOk) {
    entry.attemptsLeft -= 1;
    store.set(key(email, role), entry);
    return { ok: false, error: "Incorrect verification codes." };
  }
  store.delete(key(email, role));
  return { ok: true };
}
