import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import { ensureAdminMutationOrigin, parseJsonBody, rejectUnknownFields } from "../../../../../../lib/adminDashboard/http";
import { FinancialAdminError, getFinancialConfig, updateFinancialConfig } from "../../../../../../lib/adminDashboard/financialService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const url = new URL(request.url);
    const tenantId = String(url.searchParams.get("tenantId") || "").trim() || undefined;
    const config = await getFinancialConfig({ tenantId });
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load financial config" },
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
      "tenantId",
      "effectiveFrom",
      "correlationId",
      "feeConfig",
      "fxPolicy",
      "escrowPolicy",
    ]);
    if (unknownError) return unknownError;

    const result = await updateFinancialConfig({
      actor: {
        actorId: admin.actorId,
        actorRole: admin.actorRole,
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
      reason: String(body.reason || ""),
      tenantId: String(body.tenantId || "").trim() || undefined,
      effectiveFrom: String(body.effectiveFrom || "").trim() || undefined,
      correlationId: String(body.correlationId || "").trim() || undefined,
      feeConfig:
        body.feeConfig && typeof body.feeConfig === "object" && !Array.isArray(body.feeConfig)
          ? (body.feeConfig as any)
          : undefined,
      fxPolicy:
        body.fxPolicy && typeof body.fxPolicy === "object" && !Array.isArray(body.fxPolicy)
          ? (body.fxPolicy as any)
          : undefined,
      escrowPolicy:
        body.escrowPolicy && typeof body.escrowPolicy === "object" && !Array.isArray(body.escrowPolicy)
          ? (body.escrowPolicy as any)
          : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FinancialAdminError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update financial config" },
      { status: 500 }
    );
  }
}
