import { cookies } from "next/headers";
import { verifyToken } from "./token";
import { findUserById } from "../data/mockDb";
import { authCookieName } from "./request";
import type { Actor } from "../rbac/types";

export function getServerActor(): Actor | null {
  const token = cookies().get(authCookieName())?.value;
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

