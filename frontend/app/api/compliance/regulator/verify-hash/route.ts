import { NextResponse } from "next/server";
import { verifyHash } from "../../../../../lib/compliance/store";
import { requireRegulator } from "../../../../../lib/auth/roleGuard";

export async function POST(request: Request) {
  const regulator = requireRegulator(request.headers);
  if (!regulator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const payload = await request.json();
    const sha256 = String(payload?.sha256 || "").trim();
    if (!/^[a-f0-9]{64}$/i.test(sha256)) {
      return NextResponse.json({ error: "Invalid SHA-256" }, { status: 400 });
    }
    const result = verifyHash(sha256);
    if (result.match) {
      if (result.type === "DOCUMENT") {
        return NextResponse.json({
          match: true,
          type: "DOCUMENT",
          documentType: result.document?.documentType,
          filename: result.document?.filename,
          applicationId: result.document?.applicationId,
          uploadedAt: result.document?.uploadedAt,
        });
      }
      return NextResponse.json({
        match: true,
        type: "MANIFEST",
        exportId: result.export?.exportId,
        applicationId: result.export?.applicationId,
        createdAt: result.export?.createdAt,
      });
    }
    return NextResponse.json({ match: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify hash" },
      { status: 500 }
    );
  }
}

