import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import { ensureAdminMutationOrigin, parseJsonBody, rejectUnknownFields } from "../../../../../../lib/adminDashboard/http";
import { GovernanceAdminError, triggerGovernanceAudit } from "../../../../../../lib/adminDashboard/governanceService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = ensureAdminMutationOrigin(request);
  if (originError) return originError;

  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await parseJsonBody(request);
    const unknownError = rejectUnknownFields(body, ["reason", "tenantId", "correlationId"]);
    if (unknownError) return unknownError;

    const result = await triggerGovernanceAudit({
      actor: {
        actorId: admin.actorId,
        actorRole: admin.actorRole,
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
      reason: String(body.reason || ""),
      tenantId: String(body.tenantId || "").trim() || undefined,
      correlationId: String(body.correlationId || "").trim() || undefined,
    });

    return NextResponse.json(result, { status: 501 });
  } catch (error) {
    if (error instanceof GovernanceAdminError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to trigger governance audit" },
      { status: 500 }
    );
  }
}
