import crypto from "crypto";

type SessionPayload = {
  role: "buyer" | "supplier" | "service-partner" | "freight" | "regulator" | "admin";
  email: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
};

const SESSION_COOKIE = "rre_session";

function getSecret() {
  const secret = process.env.RRE_SESSION_SECRET || "";
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("RRE_SESSION_SECRET is not set");
  }
  return secret || "dev-session-secret";
}

function base64UrlEncode(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(input: string) {
  const secret = getSecret();
  return base64UrlEncode(crypto.createHmac("sha256", secret).update(input).digest());
}

export function createSessionToken(payload: Omit<SessionPayload, "issuedAt" | "expiresAt"> & { ttlHours?: number }) {
  const now = new Date();
  const ttlHours = payload.ttlHours ?? 12;
  const session: SessionPayload = {
    role: payload.role,
    email: payload.email,
    userId: payload.userId,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString(),
  };
  const json = JSON.stringify(session);
  const encoded = base64UrlEncode(json);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  if (expected !== signature) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded).toString("utf8")) as SessionPayload;
    if (!payload?.expiresAt) return null;
    if (new Date(payload.expiresAt).getTime() < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionFromCookieHeader(cookieHeader: string | null): SessionPayload | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(`${SESSION_COOKIE}=`.length));
  return verifySessionToken(token);
}

export function buildSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 12; // 12 hours
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge};${secure ? " Secure;" : ""}`;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
