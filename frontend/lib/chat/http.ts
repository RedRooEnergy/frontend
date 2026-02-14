import { NextResponse } from "next/server";
import { resolveChatActor } from "./auth";
import { isAllowedMutationOrigin } from "./origin";
import { ChatServiceError } from "./ChatService";
import type { ChatActor } from "./types";

export function requireAuthenticatedChatActor(request: Request): ChatActor | NextResponse {
  const actor = resolveChatActor(request.headers);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return actor;
}

export function ensureChatMutationOrigin(request: Request): NextResponse | null {
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
    throw new ChatServiceError("CHAT_INVALID_JSON", "Invalid JSON payload", 400);
  }
}

export function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
}

export function toChatErrorResponse(error: unknown) {
  if (error instanceof ChatServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message, code: "CHAT_INTERNAL_ERROR" }, { status: 500 });
}
