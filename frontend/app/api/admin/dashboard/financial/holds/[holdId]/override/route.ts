import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../../../lib/auth/adminGuard";
import { ensureAdminMutationOrigin, parseJsonBody, rejectUnknownFields } from "../../../../../../../../lib/adminDashboard/http";
import { FinancialAdminError, overrideFinancialHold } from "../../../../../../../../lib/adminDashboard/financialService";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: { holdId: string } }) {
  const originError = ensureAdminMutationOrigin(request);
  if (originError) return originError;

  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await parseJsonBody(request);
    const unknownError = rejectUnknownFields(body, ["reason", "justification", "durationHours", "correlationId"]);
    if (unknownError) return unknownError;

    const result = await overrideFinancialHold({
      actor: {
        actorId: admin.actorId,
        actorRole: admin.actorRole,
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
      holdId: String(context.params.holdId || ""),
      reason: String(body.reason || ""),
      justification: String(body.justification || ""),
      durationHours:
        body.durationHours === undefined || body.durationHours === null
          ? undefined
          : Number(body.durationHours),
      correlationId: String(body.correlationId || "").trim() || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FinancialAdminError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to override hold" },
      { status: 500 }
    );
  }
}
