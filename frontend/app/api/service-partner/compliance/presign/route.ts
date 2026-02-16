import { NextResponse } from "next/server";
import { presignUpload } from "../../../../../lib/servicePartner/storage";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fileName?: string;
      fileType?: string;
      fileSize?: number;
      kind?: string;
    };

    if (!body.fileName || !body.fileSize || !body.kind) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

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
