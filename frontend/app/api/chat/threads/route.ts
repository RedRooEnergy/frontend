import { NextResponse } from "next/server";
import { createThread, listThreadSummaries } from "../../../../lib/chat/ChatService";
import {
  ensureChatMutationOrigin,
  parseJsonBody,
  parsePositiveInt,
  requireAuthenticatedChatActor,
  toChatErrorResponse,
} from "../../../../lib/chat/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actorOrResponse = requireAuthenticatedChatActor(request);
  if (actorOrResponse instanceof NextResponse) return actorOrResponse;

  try {
    const url = new URL(request.url);
    const scope = String(url.searchParams.get("scope") || "mine").trim().toLowerCase();
    if (scope !== "mine" && scope !== "all") {
      return NextResponse.json({ error: "scope must be mine or all" }, { status: 400 });
    }
    const status = String(url.searchParams.get("status") || "ALL");
    const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 200);
    const search = String(url.searchParams.get("search") || "").trim() || null;

    const items = await listThreadSummaries({
      actor: actorOrResponse,
      status,
      limit,
      search,
    });

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error) {
    return toChatErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const originError = ensureChatMutationOrigin(request);
  if (originError) return originError;

  const actorOrResponse = requireAuthenticatedChatActor(request);
  if (actorOrResponse instanceof NextResponse) return actorOrResponse;

  try {
    const payload = await parseJsonBody(request);
    const thread = await createThread({
      actor: actorOrResponse,
      payload,
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    return toChatErrorResponse(error);
  }
}
