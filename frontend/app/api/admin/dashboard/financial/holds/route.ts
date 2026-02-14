import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import {
  FinancialAdminError,
  createFinancialHold,
} from "../../../../../../lib/adminDashboard/financialService";
import { ensureAdminMutationOrigin, parseJsonBody, rejectUnknownFields } from "../../../../../../lib/adminDashboard/http";
import { listSettlementHolds } from "../../../../../../lib/adminDashboard/settlementHoldStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = requireAdmin(request.headers);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const url = new URL(request.url);
    const statusValue = String(url.searchParams.get("status") || "").trim().toUpperCase();
    const status =
      statusValue === "ACTIVE" || statusValue === "OVERRIDDEN" || statusValue === "RELEASED"
        ? statusValue
        : undefined;
    const tenantId = String(url.searchParams.get("tenantId") || "").trim() || undefined;
    const limitParam = Number(url.searchParams.get("limit") || "");
    const limit = Number.isFinite(limitParam) ? limitParam : undefined;
    const holds = await listSettlementHolds({
      tenantId,
      status: status as any,
      limit,
    });
    return NextResponse.json({ holds, total: holds.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to list holds" },
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
      "reasonCode",
      "tenantId",
      "correlationId",
      "subsystem",
      "scope",
    ]);
    if (unknownError) return unknownError;

    if (!body.scope || typeof body.scope !== "object" || Array.isArray(body.scope)) {
      return NextResponse.json({ error: "scope object is required" }, { status: 400 });
    }

    const result = await createFinancialHold({
      actor: {
        actorId: admin.actorId,
        actorRole: admin.actorRole,
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
      reason: String(body.reason || ""),
      reasonCode: String(body.reasonCode || "").trim() || undefined,
      tenantId: String(body.tenantId || "").trim() || undefined,
      correlationId: String(body.correlationId || "").trim() || undefined,
      subsystem: String(body.subsystem || ""),
      scope: body.scope as {
        orderId?: string;
        paymentId?: string;
        payoutId?: string;
        supplierId?: string;
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof FinancialAdminError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create hold" },
      { status: 500 }
    );
  }
}
