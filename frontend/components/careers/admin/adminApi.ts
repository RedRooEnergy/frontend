export function getAdminHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.NODE_ENV !== "production") {
    headers["x-test-role"] = "admin";
    headers["x-test-userid"] = "admin";
  }
  if (process.env.NEXT_PUBLIC_CAREERS_ADMIN_KEY) {
    headers["x-admin-key"] = process.env.NEXT_PUBLIC_CAREERS_ADMIN_KEY;
  }
  return headers;
}
