import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

function resolveUploadPath(key: string) {
  const uploadsDir = path.join(process.cwd(), ".uploads");
  const targetPath = path.join(uploadsDir, key);
  const normalizedUploadsDir = path.resolve(uploadsDir);
  const normalizedTargetPath = path.resolve(targetPath);
  if (!normalizedTargetPath.startsWith(`${normalizedUploadsDir}${path.sep}`)) {
    throw new Error("Invalid key");
  }
  return normalizedTargetPath;
}

function isPdfStorageKey(key: string) {
  return path.extname(key).toLowerCase() === ".pdf";
}

function isPdfMime(contentType: string) {
  return contentType.toLowerCase().split(";")[0].trim() === "application/pdf";
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }
  if (!isPdfStorageKey(key)) {
    return NextResponse.json({ error: "PDF files only" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") || "application/octet-stream";
  if (!isPdfMime(contentType)) {
    return NextResponse.json({ error: "PDF files only" }, { status: 400 });
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  const filePath = resolveUploadPath(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);

  return NextResponse.json({ ok: true, storageKey: key });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }
  if (!isPdfStorageKey(key)) {
    return NextResponse.json({ error: "PDF files only" }, { status: 400 });
  }
  try {
    const filePath = resolveUploadPath(key);
    const bytes = await readFile(filePath);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
