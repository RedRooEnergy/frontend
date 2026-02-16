import { NextResponse } from "next/server";
import { getDownloadUrl } from "../../../../../lib/servicePartner/storage";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }
  try {
    const url = getDownloadUrl(key);
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unable to generate download link" }, { status: 400 });
  }
}
