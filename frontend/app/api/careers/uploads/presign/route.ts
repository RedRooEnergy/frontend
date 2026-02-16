import { NextResponse } from "next/server";
import { checkRateLimit } from "../../../../../lib/careers/rateLimit";
import { presignUpload } from "../../../../../lib/careers/storage";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = await checkRateLimit(ip, 5 * 60 * 1000, 20);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await request.json()) as {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    kind?: string;
  };

  if (!body.fileName || !body.fileSize || !body.kind) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const presign = presignUpload({
      fileName: body.fileName,
      fileType: body.fileType,
      fileSize: body.fileSize,
      kind: body.kind,
    });
    return NextResponse.json(presign);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload not permitted" }, { status: 400 });
  }
}
