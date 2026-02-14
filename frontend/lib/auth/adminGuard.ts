import { getSessionFromCookieHeader } from "./sessionCookie";

type AdminContext = { actorId: string; actorRole: "admin" };

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isSecureTransport(headers: Headers) {
  const forwardedProto = String(headers.get("x-forwarded-proto") || "https")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return forwardedProto === "https";
}

export function requireAdmin(headers: Headers): AdminContext | null {
  if (headers.get("x-dev-admin") === "1") {
    if (isProduction()) {
      return null;
    }
    return {
      actorId: headers.get("x-dev-admin-user") || headers.get("x-dev-admin-email") || "dev-admin",
      actorRole: "admin",
    };
  }
  if (isProduction() && !isSecureTransport(headers)) return null;
  const cookieHeader = headers.get("cookie");
  const session = getSessionFromCookieHeader(cookieHeader);
  if (!session || session.role !== "admin") return null;
  return { actorId: session.userId || session.email, actorRole: "admin" };
}
