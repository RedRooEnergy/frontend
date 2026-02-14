import { getSessionFromCookieHeader } from "./sessionCookie";

type Role = "supplier" | "regulator" | "freight";
type RoleContext = { actorId: string; actorRole: Role };

function devRole(headers: Headers, role: Role, key: string): RoleContext | null {
  if (process.env.NODE_ENV === "production") return null;
  if (headers.get(key) !== "1") return null;
  const actorId =
    headers.get(`x-dev-${role}-user`) ||
    headers.get(`x-dev-${role}-email`) ||
    `dev-${role}`;
  return { actorId, actorRole: role };
}

export function requireSupplier(headers: Headers): RoleContext | null {
  const dev = devRole(headers, "supplier", "x-dev-supplier");
  if (dev) return dev;
  const cookieHeader = headers.get("cookie");
  const session = getSessionFromCookieHeader(cookieHeader);
  if (!session || session.role !== "supplier") return null;
  return { actorId: session.userId || session.email, actorRole: "supplier" };
}

export function requireRegulator(headers: Headers): RoleContext | null {
  const dev = devRole(headers, "regulator", "x-dev-regulator");
  if (dev) return dev;
  const cookieHeader = headers.get("cookie");
  const session = getSessionFromCookieHeader(cookieHeader);
  if (!session || session.role !== "regulator") return null;
  return { actorId: session.userId || session.email, actorRole: "regulator" };
}

export function requireFreight(headers: Headers): RoleContext | null {
  const dev = devRole(headers, "freight", "x-dev-freight");
  if (dev) return dev;
  const cookieHeader = headers.get("cookie");
  const session = getSessionFromCookieHeader(cookieHeader);
  if (!session || session.role !== "freight") return null;
  return { actorId: session.userId || session.email, actorRole: "freight" };
}
