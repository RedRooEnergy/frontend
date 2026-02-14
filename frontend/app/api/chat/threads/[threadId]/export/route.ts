import { NextResponse } from "next/server";
import { exportThreadEvidence } from "../../../../../../lib/chat/ChatService";
import { requireAuthenticatedChatActor, toChatErrorResponse } from "../../../../../../lib/chat/http";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { threadId: string } }) {
  const actorOrResponse = requireAuthenticatedChatActor(request);
  if (actorOrResponse instanceof NextResponse) return actorOrResponse;

  try {
    const threadId = String(context.params.threadId || "").trim();
    const format = String(new URL(request.url).searchParams.get("format") || "zip").trim().toLowerCase();

    const result = await exportThreadEvidence({
      actor: actorOrResponse,
      threadId,
    });

    if (format === "json") {
      return NextResponse.json(
        {
          threadId,
          json: result.json,
          jsonHash: result.jsonHash,
          manifest: result.manifest,
          manifestHash: result.manifestHash,
          manifestSha256Text: result.manifestSha256Text,
          artifact: result.artifact,
        },
        { status: 200 }
      );
    }

    const filename = result.artifact.fileName;
    return new NextResponse(result.zipBuffer as BodyInit, {
      status: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename=\"${filename}\"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return toChatErrorResponse(error);
  }
}
