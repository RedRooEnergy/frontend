export function getTestSessionFromHeaders(headers: Headers) {
  if (process.env.NODE_ENV === "production") return null;
  const role = headers.get("x-test-role");
  const userId = headers.get("x-test-userid");
  if (!role || !userId) return null;
  if (!["buyer", "admin", "supplier", "service-partner"].includes(role)) return null;
  return { role: role as any, userId, email: `${role}-${userId}@test.local` };
}
