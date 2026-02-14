import { NextResponse } from "next/server";
import { isAllowedMutationOrigin } from "../chat/origin";

const PRODUCTION_BLOCKED_MUTATION_HEADERS = [
  "x-dev-admin",
  "x-dev-admin-user",
  "x-dev-admin-email",
  "x-test-admin-bypass",
  "x-test-admin-user",
];

function parseOrigins(raw: string | undefined) {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function hasProductionBlockedHeaders(request: Request) {
  return PRODUCTION_BLOCKED_MUTATION_HEADERS.some((name) => String(request.headers.get(name) || "").trim().length > 0);
}

function isAllowedProductionMutationOrigin(request: Request) {
  const origin = String(request.headers.get("origin") || "").trim();
  if (!origin) return false;

  const allowedOrigins = new Set([
    ...parseOrigins(process.env.RRE_ALLOWED_ORIGINS),
    ...parseOrigins(process.env.NEXT_PUBLIC_APP_ORIGIN),
    ...parseOrigins(process.env.APP_ORIGIN),
  ]);
  if (allowedOrigins.size === 0) return false;
  return allowedOrigins.has(origin);
}

export function ensureAdminMutationOrigin(request: Request) {
  if (isProduction() && hasProductionBlockedHeaders(request)) {
    return NextResponse.json({ error: "Forbidden test header in production" }, { status: 403 });
  }

  const allowed = isProduction() ? isAllowedProductionMutationOrigin(request) : isAllowedMutationOrigin(request);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }
  return null;
}

export async function parseJsonBody(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return {} as Record<string, unknown>;
    }
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return {} as Record<string, unknown>;
    }
    return body as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
}

export function rejectUnknownFields(body: Record<string, unknown>, allowed: string[]) {
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    return NextResponse.json(
      {
        error: `Unknown fields: ${unknown.join(", ")}`,
      },
      { status: 400 }
    );
  }
  return null;
}
