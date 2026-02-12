import type { NextRequest } from "next/server";
import { getActorFromRequest } from "../auth/request";
import { forbidden, unauthorized } from "../api/http";

export function requireActor(request: NextRequest) {
  const actor = getActorFromRequest(request);
  if (!actor) {
    return { ok: false as const, response: unauthorized(), actor: null };
  }
  return { ok: true as const, actor };
}

export function requireAdminActor(request: NextRequest) {
  const resolved = requireActor(request);
  if (!resolved.ok) return resolved;
  const actor = resolved.actor;
  if (!actor.roles.some((role) => role === "RRE_ADMIN" || role === "DEVELOPER" || role === "RRE_CEO")) {
    return { ok: false as const, response: forbidden("Admin role required"), actor: null };
  }
  return { ok: true as const, actor };
}

export function requireRegulatorActor(request: NextRequest) {
  const resolved = requireActor(request);
  if (!resolved.ok) return resolved;
  const actor = resolved.actor;
  if (!actor.roles.includes("RRE_REGULATOR") && !actor.roles.includes("RRE_ADMIN") && !actor.roles.includes("RRE_CEO")) {
    return { ok: false as const, response: forbidden("Regulator role required"), actor: null };
  }
  return { ok: true as const, actor };
}
