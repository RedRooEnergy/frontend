import type { NextRequest } from "next/server";
import { verifyToken } from "./token";
import { findUserById } from "../data/mockDb";
import type { Actor } from "../rbac/types";

const AUTH_COOKIE = "rre_auth_token";

export function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (header && /^Bearer\s+/i.test(header)) {
    return header.replace(/^Bearer\s+/i, "").trim();
  }
  const cookieToken = request.cookies.get(AUTH_COOKIE)?.value;
  return cookieToken || null;
}

export function getActorFromRequest(request: NextRequest): Actor | null {
  const token = getBearerToken(request);
  if (!token) return null;
  const actor = verifyToken(token);
  if (!actor) return null;
  const user = findUserById(actor.userId);
  if (!user) return null;
  return {
    userId: user.id,
    role: user.role,
    email: user.email,
  };
}

export function authCookieName() {
  return AUTH_COOKIE;
}

