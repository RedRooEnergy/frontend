import crypto from "node:crypto";
import type { Actor } from "../rbac/types";
import { getPolicyVersion } from "../rbac/runtimeStore";

type TokenPayload = {
  sub: string;
  role: Actor["role"];
  roles: Actor["roles"];
  email: string;
  policyVersion: number;
  iat: number;
  exp: number;
};

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_SECONDS = 60 * 60;

function base64urlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

function base64urlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function secret() {
  const value = process.env.RBAC_JWT_SECRET;
  if (!value) {
    throw new Error("RBAC_JWT_SECRET is required for token signing and verification");
  }
  return value;
}

function sign(rawPayload: string) {
  return crypto.createHmac("sha256", secret()).update(rawPayload).digest("base64url");
}

export function issueToken(actor: Actor, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: actor.userId,
    role: actor.role,
    roles: actor.roles,
    email: actor.email,
    policyVersion: getPolicyVersion(),
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  };
  const payloadEncoded = base64urlEncode(JSON.stringify(payload));
  const versionEncoded = base64urlEncode(TOKEN_VERSION);
  const data = `${versionEncoded}.${payloadEncoded}`;
  const signature = sign(data);
  return `${data}.${signature}`;
}

export function verifyToken(token: string): Actor | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [versionEncoded, payloadEncoded, signature] = parts;
  const version = base64urlDecode(versionEncoded);
  if (version !== TOKEN_VERSION) return null;
  const data = `${versionEncoded}.${payloadEncoded}`;
  if (sign(data) !== signature) return null;

  const payload = JSON.parse(base64urlDecode(payloadEncoded)) as TokenPayload;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSeconds) return null;
  if (payload.policyVersion !== getPolicyVersion()) return null;

  return {
    userId: payload.sub,
    role: payload.role,
    roles: payload.roles,
    email: payload.email,
  };
}
