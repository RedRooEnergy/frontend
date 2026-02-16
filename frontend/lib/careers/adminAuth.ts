import { getTestSessionFromHeaders } from "../testSession";

export function isAdminRequest(headers: Headers) {
  const testSession = getTestSessionFromHeaders(headers);
  if (testSession?.role === "admin") return true;
  const adminKey = process.env.CAREERS_ADMIN_KEY;
  const provided = headers.get("x-admin-key");
  if (adminKey && provided && adminKey === provided) return true;
  return false;
}

