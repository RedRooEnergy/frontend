import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key || key.includes("..")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const safeKey = key.replace(/[^a-zA-Z0-9._/\\-]/g, "_");
  const filePath = path.join(process.cwd(), "public", "uploads", safeKey);
  const buffer = Buffer.from(await request.arrayBuffer());
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);

  return NextResponse.json({ ok: true, url: `/uploads/${safeKey}` });
}
