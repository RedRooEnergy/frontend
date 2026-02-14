import { NextResponse } from "next/server";
import { requestChatAttachmentUpload } from "../../../../lib/chat/ChatAttachmentService";
import {
  ensureChatMutationOrigin,
  parseJsonBody,
  requireAuthenticatedChatActor,
  toChatErrorResponse,
} from "../../../../lib/chat/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = ensureChatMutationOrigin(request);
  if (originError) return originError;

  const actorOrResponse = requireAuthenticatedChatActor(request);
  if (actorOrResponse instanceof NextResponse) return actorOrResponse;

  try {
    const payload = await parseJsonBody(request);
    const allowed = ["fileName", "mime", "size"];
    const unknown = Object.keys(payload).filter((key) => !allowed.includes(key));
    if (unknown.length > 0) {
      return NextResponse.json({ error: `Unknown fields: ${unknown.join(", ")}` }, { status: 400 });
    }

    const upload = await requestChatAttachmentUpload({
      actor: actorOrResponse,
      fileName: String(payload.fileName || ""),
      mime: String(payload.mime || ""),
      size: Number(payload.size || 0),
    });

    return NextResponse.json(upload, { status: 201 });
  } catch (error) {
    return toChatErrorResponse(error);
  }
}
