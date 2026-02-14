import { getSession } from "../store";

export type ClientRoleHeaderScope = "buyer" | "supplier" | "admin";

export function getClientRoleHeaders(scope: ClientRoleHeaderScope) {
  if (process.env.NODE_ENV === "production") return {};

  const session = getSession();
  if (!session || session.role !== scope) return {};

  if (scope === "admin") {
    return {
      "x-dev-admin": "1",
      "x-dev-admin-user": session.userId || "",
      "x-dev-admin-email": session.email || "",
    };
  }

  if (scope === "supplier") {
    return {
      "x-dev-supplier": "1",
      "x-dev-supplier-user": session.userId || "",
      "x-dev-supplier-email": session.email || "",
    };
  }

  return {
    "x-dev-buyer": "1",
    "x-dev-buyer-user": session.userId || "",
    "x-dev-buyer-email": session.email || "",
  };
}
