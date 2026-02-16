import { NextResponse } from "next/server";
import { createApplication } from "../../../../lib/compliance/store";
import { requireSupplier } from "../../../../lib/auth/roleGuard";

export async function POST(request: Request) {
  const supplier = requireSupplier(request.headers);
  if (!supplier) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const payload = await request.json();
    const app = createApplication(
      supplier.actorId,
      payload.productType,
      payload.markets || []
    );
    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create application" },
      { status: 500 }
    );
  }
}

