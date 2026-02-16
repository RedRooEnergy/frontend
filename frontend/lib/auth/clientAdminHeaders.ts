import { getSession } from "../store";

export function getAdminAuthHeaders() {
  const session = getSession();
  if (!session || session.role !== "admin") return {};
  if (process.env.NODE_ENV === "production") return {};
  return {
    "x-dev-admin": "1",
    "x-dev-admin-user": session.userId || "",
    "x-dev-admin-email": session.email || "",
  };
}
