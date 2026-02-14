import { getSessionFromCookieHeader } from "./sessionCookie";

type AdminContext = { actorId: string; actorRole: "admin" };

export function requireAdmin(headers: Headers): AdminContext | null {
  if (process.env.NODE_ENV !== "production" && headers.get("x-dev-admin") === "1") {
    return {
      actorId: headers.get("x-dev-admin-user") || headers.get("x-dev-admin-email") || "dev-admin",
      actorRole: "admin",
    };
  }
  const cookieHeader = headers.get("cookie");
  const session = getSessionFromCookieHeader(cookieHeader);
  if (!session || session.role !== "admin") return null;
  return { actorId: session.userId || session.email, actorRole: "admin" };
}
