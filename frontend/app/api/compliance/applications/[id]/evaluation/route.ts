import { NextResponse } from "next/server";
import { evaluateApplication } from "../../../../../../lib/compliance/store";
import { requireSupplier } from "../../../../../../lib/auth/roleGuard";

export async function GET(request: Request, context: { params: { id: string } }) {
  const supplier = requireSupplier(request.headers);
  if (!supplier) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const evaluation = evaluateApplication(context.params.id);
    return NextResponse.json(evaluation);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to evaluate application" },
      { status: 500 }
    );
  }
}

