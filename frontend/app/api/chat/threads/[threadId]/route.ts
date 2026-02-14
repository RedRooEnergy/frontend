import { NextResponse } from "next/server";
import { getThreadDetail } from "../../../../../lib/chat/ChatService";
import { parsePositiveInt, requireAuthenticatedChatActor, toChatErrorResponse } from "../../../../../lib/chat/http";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { threadId: string } }) {
  const actorOrResponse = requireAuthenticatedChatActor(request);
  if (actorOrResponse instanceof NextResponse) return actorOrResponse;

  try {
    const threadId = String(context.params.threadId || "").trim();
    const url = new URL(request.url);
    const limit = parsePositiveInt(url.searchParams.get("limit"), 100, 500);
    const before = String(url.searchParams.get("before") || "").trim() || undefined;

    const detail = await getThreadDetail({
      actor: actorOrResponse,
      threadId,
      limit,
      before,
    });

    return NextResponse.json(detail, {
      headers: {
        ETag: detail.etag,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return toChatErrorResponse(error);
  }
}
