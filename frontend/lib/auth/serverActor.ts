import { cookies } from "next/headers";
import { verifyToken } from "./token";
import { findUserById } from "../data/mockDb";
import { authCookieName } from "./request";
import { getUserRoleCodes } from "../rbac/runtimeStore";
import type { Actor } from "../rbac/types";

export function getServerActor(): Actor | null {
  const token = cookies().get(authCookieName())?.value;
  if (!token) return null;
  const actor = verifyToken(token);
  if (!actor) return null;
  const user = findUserById(actor.userId);
  if (!user) return null;
  const roleCodes = getUserRoleCodes(user.id);
  if (!roleCodes.length) return null;
  return {
    userId: user.id,
    role: roleCodes[0],
    roles: roleCodes,
    email: user.email,
  };
}
