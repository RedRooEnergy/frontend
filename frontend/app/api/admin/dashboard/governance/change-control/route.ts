import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import { ensureAdminMutationOrigin, parseJsonBody, parsePositiveInt, rejectUnknownFields } from "../../../../../../lib/adminDashboard/http";
import {
  GovernanceAdminError,
  createGovernanceChangeControl,
  getGovernanceChangeControls,
} from "../../../../../../lib/adminDashboard/governanceService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const url = new URL(request.url);
    const tenantId = String(url.searchParams.get("tenantId") || "").trim() || undefined;
    const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 200);
    const items = await getGovernanceChangeControls({ tenantId, limit });
    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to list change controls" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const originError = ensureAdminMutationOrigin(request);
  if (originError) return originError;

  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await parseJsonBody(request);
    const unknownError = rejectUnknownFields(body, [
      "reason",
      "rationale",
      "type",
      "scope",
      "tenantId",
      "correlationId",
      "impactAssessment",
    ]);
    if (unknownError) return unknownError;

    const result = await createGovernanceChangeControl({
      actor: {
        actorId: admin.actorId,
        actorRole: admin.actorRole,
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
      reason: String(body.reason || ""),
      rationale: String(body.rationale || ""),
      type: String(body.type || ""),
      scope:
        body.scope && typeof body.scope === "object" && !Array.isArray(body.scope)
          ? (body.scope as { entityType?: string; entityId?: string })
          : undefined,
      tenantId: String(body.tenantId || "").trim() || undefined,
      correlationId: String(body.correlationId || "").trim() || undefined,
      impactAssessment:
        body.impactAssessment && typeof body.impactAssessment === "object" && !Array.isArray(body.impactAssessment)
          ? (body.impactAssessment as { riskLevel?: "LOW" | "MED" | "HIGH"; rollbackPlan?: string; affectedParties?: string[] })
          : undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof GovernanceAdminError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create change control event" },
      { status: 500 }
    );
  }
}
