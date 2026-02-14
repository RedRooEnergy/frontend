import { getSessionFromCookieHeader } from "../auth/sessionCookie";
import type { ChatActor } from "./types";

function mapRole(role: string): ChatActor["actorRole"] | null {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "buyer") return "BUYER";
  if (normalized === "supplier") return "SUPPLIER";
  if (normalized === "admin") return "ADMIN";
  if (normalized === "regulator") return "REGULATOR";
  if (normalized === "freight") return "FREIGHT";
  if (normalized === "service-partner") return "SERVICE_PARTNER";
  return null;
}

function devActor(headers: Headers): ChatActor | null {
  if (process.env.NODE_ENV === "production") return null;

  const role = mapRole(headers.get("x-dev-role") || "");
  if (!role) return null;

  const actorId =
    String(headers.get("x-dev-user") || headers.get("x-dev-userid") || `${role.toLowerCase()}-dev`).trim() ||
    `${role.toLowerCase()}-dev`;
  const actorEmail =
    String(headers.get("x-dev-email") || `${actorId}@dev.local`).trim().toLowerCase() || `${actorId}@dev.local`;

  return {
    actorId,
    actorEmail,
    actorRole: role,
  };
}

export function resolveChatActor(headers: Headers): ChatActor | null {
  const dev = devActor(headers);
  if (dev) return dev;

  const session = getSessionFromCookieHeader(headers.get("cookie"));
  if (!session) return null;

  const role = mapRole(session.role);
  if (!role) return null;

  const actorId = String(session.userId || session.email || "").trim();
  const actorEmail = String(session.email || "").trim().toLowerCase();
  if (!actorId || !actorEmail) return null;

  return {
    actorId,
    actorEmail,
    actorRole: role,
  };
}
