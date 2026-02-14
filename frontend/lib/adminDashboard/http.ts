import { NextResponse } from "next/server";
import { isAllowedMutationOrigin } from "../chat/origin";

export function ensureAdminMutationOrigin(request: Request) {
  if (!isAllowedMutationOrigin(request)) {
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
