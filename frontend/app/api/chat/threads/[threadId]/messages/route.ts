import { NextResponse } from "next/server";
import { postMessage } from "../../../../../../lib/chat/ChatService";
import {
  ensureChatMutationOrigin,
  parseJsonBody,
  requireAuthenticatedChatActor,
  toChatErrorResponse,
} from "../../../../../../lib/chat/http";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: { threadId: string } }) {
  const originError = ensureChatMutationOrigin(request);
  if (originError) return originError;

  const actorOrResponse = requireAuthenticatedChatActor(request);
  if (actorOrResponse instanceof NextResponse) return actorOrResponse;

  try {
    const payload = await parseJsonBody(request);
    const result = await postMessage({
      actor: actorOrResponse,
      threadId: String(context.params.threadId || "").trim(),
      payload,
    });

    return NextResponse.json(result, {
      status: 201,
      headers: {
        "x-chat-rate-limit-current": String(result.rateLimit.current),
        "x-chat-rate-limit-max": String(result.rateLimit.max),
        "x-chat-rate-limit-window": String(result.rateLimit.windowSeconds),
      },
    });
  } catch (error) {
    return toChatErrorResponse(error);
  }
}
