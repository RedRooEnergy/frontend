const LOCAL_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://localhost:3000",
  "https://127.0.0.1:3000",
]);

function parseOrigins(raw: string | undefined) {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hostToOrigin(scheme: string, host: string) {
  return `${scheme}://${host}`;
}

export function isAllowedMutationOrigin(request: Request): boolean {
  const origin = String(request.headers.get("origin") || "").trim();
  const host = String(
    request.headers.get("x-forwarded-host") || request.headers.get("host") || ""
  ).trim();
  const proto = String(request.headers.get("x-forwarded-proto") || "https").trim() || "https";

  const envOrigins = new Set([
    ...parseOrigins(process.env.RRE_ALLOWED_ORIGINS),
    ...parseOrigins(process.env.NEXT_PUBLIC_APP_ORIGIN),
    ...parseOrigins(process.env.APP_ORIGIN),
  ]);

  if (process.env.NODE_ENV !== "production") {
    LOCAL_ORIGINS.forEach((item) => envOrigins.add(item));
  }

  if (host) {
    envOrigins.add(hostToOrigin(proto, host));
    envOrigins.add(hostToOrigin("https", host));
    envOrigins.add(hostToOrigin("http", host));
  }

  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }

  return envOrigins.has(origin);
}
