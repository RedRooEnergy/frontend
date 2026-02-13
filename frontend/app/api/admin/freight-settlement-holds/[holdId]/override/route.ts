import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/auth/adminGuard";
import { overridePayoutSettlementHold } from "../../../../../../lib/freightAudit/FreightSoftEnforcementService";
import { emitAuthorityObserveDecision } from "../../../../../../lib/governance/authority/observe";

export const runtime = "nodejs";

type Payload = {
  approvalId?: string;
  rationale?: string;
  evidenceManifestHash?: string;
};

export async function POST(request: Request, context: { params: { holdId: string } }) {
  const admin = requireAdmin(request.headers);
  if (!admin) {
    emitAuthorityObserveDecision({
      policyId: "gov04.authority.freight.hold_override.observe.v1",
      subjectActorId: "unknown_hold",
      requestActorId: "anonymous",
      requestActorRole: "system",
      resource: "freight.settlement_hold",
      action: "override",
      observedDecision: "WOULD_DENY",
      reasonCodes: ["ADMIN_REQUIRED"],
      metadata: {
        route: "api.admin.freight-settlement-holds.override",
        status: "forbidden",
      },
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const holdId = String(context.params.holdId || "").trim();
  if (!holdId) {
    emitAuthorityObserveDecision({
      policyId: "gov04.authority.freight.hold_override.observe.v1",
      subjectActorId: "unknown_hold",
      requestActorId: admin.actorId,
      requestActorRole: admin.actorRole,
      resource: "freight.settlement_hold",
      action: "override",
      observedDecision: "WOULD_DENY",
      reasonCodes: ["HOLD_ID_REQUIRED"],
      metadata: {
        route: "api.admin.freight-settlement-holds.override",
        status: "invalid_payload",
      },
    });
    return NextResponse.json({ error: "holdId required" }, { status: 400 });
  }

  const payload = (await request.json()) as Payload;
  const approvalId = String(payload.approvalId || "").trim();
  const rationale = String(payload.rationale || "").trim();
  const evidenceManifestHash = String(payload.evidenceManifestHash || "").trim().toLowerCase();

  if (!approvalId || !rationale || !evidenceManifestHash) {
    emitAuthorityObserveDecision({
      policyId: "gov04.authority.freight.hold_override.observe.v1",
      subjectActorId: holdId,
      requestActorId: admin.actorId,
      requestActorRole: admin.actorRole,
      resource: "freight.settlement_hold",
      action: "override",
      observedDecision: "WOULD_DENY",
      reasonCodes: ["OVERRIDE_FIELDS_REQUIRED"],
      metadata: {
        route: "api.admin.freight-settlement-holds.override",
        status: "invalid_payload",
      },
    });
    return NextResponse.json(
      { error: "approvalId, rationale, evidenceManifestHash required" },
      { status: 400 }
    );
  }

  try {
    const hold = await overridePayoutSettlementHold({
      holdId,
      approvalId,
      rationale,
      evidenceManifestHash,
      actorId: admin.actorId,
      actorRole: "admin",
    });
    emitAuthorityObserveDecision({
      policyId: "gov04.authority.freight.hold_override.observe.v1",
      subjectActorId: holdId,
      requestActorId: admin.actorId,
      requestActorRole: admin.actorRole,
      resource: "freight.settlement_hold",
      action: "override",
      observedDecision: "WOULD_ALLOW",
      reasonCodes: ["HOLD_OVERRIDE_RECORDED"],
      metadata: {
        route: "api.admin.freight-settlement-holds.override",
        status: "success",
        approvalId,
        holdStatus: hold.status,
      },
    });
    return NextResponse.json({ ok: true, hold });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error || "Unable to override settlement hold");
    emitAuthorityObserveDecision({
      policyId: "gov04.authority.freight.hold_override.observe.v1",
      subjectActorId: holdId,
      requestActorId: admin.actorId,
      requestActorRole: admin.actorRole,
      resource: "freight.settlement_hold",
      action: "override",
      observedDecision: "WOULD_DENY",
      reasonCodes: [message || "HOLD_OVERRIDE_FAILED"],
      metadata: {
        route: "api.admin.freight-settlement-holds.override",
        status: "exception",
      },
    });
    if (message === "FREIGHT_SETTLEMENT_HOLD_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
