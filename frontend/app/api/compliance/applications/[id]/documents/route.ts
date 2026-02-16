import { NextResponse } from "next/server";
import { addDocument, listDocuments } from "../../../../../../lib/compliance/store";
import { requireSupplier } from "../../../../../../lib/auth/roleGuard";

export async function POST(request: Request, context: { params: { id: string } }) {
  const supplier = requireSupplier(request.headers);
  if (!supplier) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const form = await request.formData();
    const documentType = String(form.get("documentType") || "");
    const file = form.get("file") as File | null;
    if (!documentType || !file) {
      return NextResponse.json({ error: "Missing documentType or file" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const doc = addDocument(context.params.id, documentType as any, file.name, file.type || "application/octet-stream", buffer);
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload document" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request, context: { params: { id: string } }) {
  const supplier = requireSupplier(request.headers);
  if (!supplier) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const docs = listDocuments(context.params.id);
    return NextResponse.json(docs);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load documents" },
      { status: 500 }
    );
  }
}

