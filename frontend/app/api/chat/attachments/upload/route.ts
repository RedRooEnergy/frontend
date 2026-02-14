import { NextResponse } from "next/server";
import { uploadChatAttachmentBinary } from "../../../../../lib/chat/ChatAttachmentService";
import { ensureChatMutationOrigin, requireAuthenticatedChatActor, toChatErrorResponse } from "../../../../../lib/chat/http";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const originError = ensureChatMutationOrigin(request);
  if (originError) return originError;

  const actorOrResponse = requireAuthenticatedChatActor(request);
  if (actorOrResponse instanceof NextResponse) return actorOrResponse;

  try {
    const url = new URL(request.url);
    const attachmentId = String(url.searchParams.get("attachmentId") || "").trim();
    const token = String(url.searchParams.get("token") || "").trim();
    if (!attachmentId || !token) {
      return NextResponse.json({ error: "attachmentId and token are required" }, { status: 400 });
    }

    const contentType = String(request.headers.get("content-type") || "application/octet-stream").trim();
    const bytes = Buffer.from(await request.arrayBuffer());

    const result = await uploadChatAttachmentBinary({
      actor: actorOrResponse,
      attachmentId,
      token,
      mime: contentType,
      buffer: bytes,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toChatErrorResponse(error);
  }
}
