import { NextResponse } from "next/server";
import { escalateThread } from "../../../../../../lib/chat/ChatService";
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
    const result = await escalateThread({
      actor: actorOrResponse,
      threadId: String(context.params.threadId || "").trim(),
      payload,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toChatErrorResponse(error);
  }
}
