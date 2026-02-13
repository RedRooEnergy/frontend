import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "../../../../lib/auth/sessionCookie";
import { emitFeeLedgerEvent } from "../../../../lib/feeLedgerStore";
import { emitAuthorityObserveDecision } from "../../../../lib/governance/authority/observe";
import { evaluateAuthorityEnforcementDecision } from "../../../../lib/governance/authority/enforcementService";

type TriggerBody =
  | {
      triggerEvent: "WF_CERTIFIED";
      workflowId: string;
      supplierId: string;
      servicePartnerId: string;
      certificationFeeBase: number;
      currency: "AUD" | "NZD";
    }
  | {
      triggerEvent: "PRODUCT_APPROVED";
      productId: string;
      servicePartnerId: string;
      certificationFeeBase: number;
      currency: "AUD" | "NZD";
    }
  | {
      triggerEvent: "ORDER_PAID";
      orderId: string;
      installerId: string;
      baseAmount: number;
      currency: "AUD" | "NZD";
    };

function requireSession(headers: Headers) {
  const session = getSessionFromCookieHeader(headers.get("cookie"));
  if (!session) return null;
  return session;
}

function emitFeeEngineAuthorityObservation(input: {
  session:
    | {
        userId: string;
        role: "buyer" | "supplier" | "service-partner" | "freight" | "regulator" | "admin";
      }
    | null;
  subjectActorId: string;
  resource: string;
  action: string;
  observedDecision: "WOULD_ALLOW" | "WOULD_DENY";
  reasonCodes: string[];
  metadata?: Record<string, unknown>;
}) {
  emitAuthorityObserveDecision({
    policyId: "gov04.authority.fee_engine.observe.v1",
    subjectActorId: input.subjectActorId || "unknown_subject",
    requestActorId: input.session?.userId || "anonymous",
    requestActorRole: input.session?.role || "system",
    resource: input.resource,
    action: input.action,
    observedDecision: input.observedDecision,
    reasonCodes: input.reasonCodes,
    metadata: {
      route: "api.internal.fee-engine",
      ...(input.metadata || {}),
    },
  });
}

type FeeLedgerEmitter = typeof emitFeeLedgerEvent;
type AuthorityEnforcementEvaluator = typeof evaluateAuthorityEnforcementDecision;

let feeLedgerEmitter: FeeLedgerEmitter = emitFeeLedgerEvent;
let authorityEnforcementEvaluator: AuthorityEnforcementEvaluator = evaluateAuthorityEnforcementDecision;

export function __setFeeLedgerEmitterForTests(emitter?: FeeLedgerEmitter) {
  feeLedgerEmitter = emitter || emitFeeLedgerEvent;
}

export function __setAuthorityEnforcementEvaluatorForTests(evaluator?: AuthorityEnforcementEvaluator) {
  authorityEnforcementEvaluator = evaluator || evaluateAuthorityEnforcementDecision;
}

export async function POST(request: Request) {
  const session = requireSession(request.headers);
  if (!session) {
    emitFeeEngineAuthorityObservation({
      session: null,
      subjectActorId: "unknown_subject",
      resource: "fee_ledger.event",
      action: "emit",
      observedDecision: "WOULD_DENY",
      reasonCodes: ["SESSION_REQUIRED"],
      metadata: {
        status: "unauthorized",
      },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as TriggerBody;
  if (!body?.triggerEvent) {
    emitFeeEngineAuthorityObservation({
      session,
      subjectActorId: "unknown_subject",
      resource: "fee_ledger.event",
      action: "emit",
      observedDecision: "WOULD_DENY",
      reasonCodes: ["TRIGGER_EVENT_REQUIRED"],
      metadata: {
        status: "invalid_payload",
      },
    });
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    if (body.triggerEvent === "WF_CERTIFIED") {
      if (!["service-partner", "admin"].includes(session.role)) {
        emitFeeEngineAuthorityObservation({
          session,
          subjectActorId: String(body.supplierId || "unknown_subject"),
          resource: "compliance.workflow",
          action: "fee_ledger.emit.wf_certified",
          observedDecision: "WOULD_DENY",
          reasonCodes: ["ROLE_FORBIDDEN"],
          metadata: {
            triggerEvent: body.triggerEvent,
            status: "forbidden",
          },
        });
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.workflowId || !body.supplierId || !body.certificationFeeBase || !body.currency) {
        emitFeeEngineAuthorityObservation({
          session,
          subjectActorId: String(body.supplierId || "unknown_subject"),
          resource: "compliance.workflow",
          action: "fee_ledger.emit.wf_certified",
          observedDecision: "WOULD_DENY",
          reasonCodes: ["WORKFLOW_PAYLOAD_MISSING"],
          metadata: {
            triggerEvent: body.triggerEvent,
            status: "invalid_payload",
          },
        });
        return NextResponse.json({ error: "Missing workflow payload" }, { status: 400 });
      }
      const event = await feeLedgerEmitter({
        triggerEvent: "WF_CERTIFIED",
        eventType: "SUPPLIER_CERTIFICATION_FEE",
        actorRole: "supplier",
        actorId: body.supplierId,
        relatedEntityType: "ComplianceWorkflow",
        relatedEntityId: body.workflowId,
        baseAmount: Number(body.certificationFeeBase),
        currency: body.currency,
        createdByRole: session.role === "admin" ? "admin" : "system",
        createdById: session.userId,
      });
      emitFeeEngineAuthorityObservation({
        session,
        subjectActorId: body.supplierId,
        resource: "compliance.workflow",
        action: "fee_ledger.emit.wf_certified",
        observedDecision: "WOULD_ALLOW",
        reasonCodes: ["FEE_EVENT_EMITTED"],
        metadata: {
          triggerEvent: body.triggerEvent,
          status: "success",
          eventId: event.eventId,
        },
      });
      return NextResponse.json({ ok: true, event });
    }

    if (body.triggerEvent === "PRODUCT_APPROVED") {
      if (session.role !== "admin") {
        emitFeeEngineAuthorityObservation({
          session,
          subjectActorId: String(body.servicePartnerId || "unknown_subject"),
          resource: "catalog.product",
          action: "fee_ledger.emit.product_approved",
          observedDecision: "WOULD_DENY",
          reasonCodes: ["ROLE_FORBIDDEN"],
          metadata: {
            triggerEvent: body.triggerEvent,
            status: "forbidden",
          },
        });
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.productId || !body.servicePartnerId || !body.certificationFeeBase || !body.currency) {
        emitFeeEngineAuthorityObservation({
          session,
          subjectActorId: String(body.servicePartnerId || "unknown_subject"),
          resource: "catalog.product",
          action: "fee_ledger.emit.product_approved",
          observedDecision: "WOULD_DENY",
          reasonCodes: ["PRODUCT_PAYLOAD_MISSING"],
          metadata: {
            triggerEvent: body.triggerEvent,
            status: "invalid_payload",
          },
        });
        return NextResponse.json({ error: "Missing product payload" }, { status: 400 });
      }

      const enforcementPolicyVersionHash =
        String(process.env.GOV04_AUTH_FEE_ENGINE_PRODUCT_APPROVED_POLICY_VERSION_HASH || "").trim().toLowerCase() ||
        String(process.env.GOV04_AUTHORITY_OBSERVE_POLICY_VERSION_HASH || "").trim().toLowerCase() ||
        undefined;

      const enforcement = await authorityEnforcementEvaluator({
        tenantId: null,
        policyId: "gov04.authority.catalog.product_approval.enforce.v1",
        policyVersionHash: enforcementPolicyVersionHash,
        subjectActorId: body.productId,
        requestActorId: session.userId,
        requestActorRole: session.role,
        approverActorId: session.userId,
        approverActorRole: session.role,
        resource: "catalog.product",
        action: "fee_ledger.emit.product_approved",
        decidedAtUtc: new Date().toISOString(),
        metadata: {
          route: "api.internal.fee-engine",
          triggerEvent: body.triggerEvent,
          productId: body.productId,
          servicePartnerId: body.servicePartnerId,
        },
      });

      if (enforcement.enforcement.divergenceDetected) {
        console.error("gov04_authority_enforcement_dual_write_divergence_detected", {
          policyId: "gov04.authority.catalog.product_approval.enforce.v1",
          productId: body.productId,
          requestActorId: session.userId,
          shadowDecisionId: enforcement.shadow?.decision.decisionId || null,
        });
      }

      if (enforcement.enforcement.failureCode) {
        console.error("gov04_authority_enforcement_internal_error", {
          policyId: "gov04.authority.catalog.product_approval.enforce.v1",
          productId: body.productId,
          requestActorId: session.userId,
          failureCode: enforcement.enforcement.failureCode,
          strictMode: enforcement.enforcement.strictMode,
        });
      }

      if (enforcement.enforcement.applied && enforcement.enforcement.result === "BLOCK") {
        return NextResponse.json(
          {
            error: "Forbidden",
            code: enforcement.enforcement.failureCode || "AUTHORITY_ENFORCEMENT_BLOCKED",
            enforcementDecisionId: enforcement.enforcement.decision?.enforcementDecisionId || null,
            shadowDecisionId: enforcement.shadow?.decision.decisionId || null,
            responseMutationCode: enforcement.enforcement.responseMutationCode || null,
          },
          { status: 403 }
        );
      }

      const event = await feeLedgerEmitter({
        triggerEvent: "PRODUCT_APPROVED",
        eventType: "PARTNER_LISTING_APPROVAL_FEE",
        actorRole: "service_partner",
        actorId: body.servicePartnerId,
        relatedEntityType: "Product",
        relatedEntityId: body.productId,
        baseAmount: Number(body.certificationFeeBase),
        currency: body.currency,
        createdByRole: "admin",
        createdById: session.userId,
      });
      emitFeeEngineAuthorityObservation({
        session,
        subjectActorId: body.servicePartnerId,
        resource: "catalog.product",
        action: "fee_ledger.emit.product_approved",
        observedDecision: "WOULD_ALLOW",
        reasonCodes: ["FEE_EVENT_EMITTED"],
        metadata: {
          triggerEvent: body.triggerEvent,
          status: "success",
          eventId: event.eventId,
        },
      });
      return NextResponse.json({ ok: true, event });
    }

    if (body.triggerEvent === "ORDER_PAID") {
      if (!["buyer", "admin"].includes(session.role)) {
        emitFeeEngineAuthorityObservation({
          session,
          subjectActorId: String(body.installerId || "unknown_subject"),
          resource: "order",
          action: "fee_ledger.emit.order_paid",
          observedDecision: "WOULD_DENY",
          reasonCodes: ["ROLE_FORBIDDEN"],
          metadata: {
            triggerEvent: body.triggerEvent,
            status: "forbidden",
          },
        });
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.orderId || !body.installerId || !body.baseAmount || !body.currency) {
        emitFeeEngineAuthorityObservation({
          session,
          subjectActorId: String(body.installerId || "unknown_subject"),
          resource: "order",
          action: "fee_ledger.emit.order_paid",
          observedDecision: "WOULD_DENY",
          reasonCodes: ["ORDER_PAYLOAD_MISSING"],
          metadata: {
            triggerEvent: body.triggerEvent,
            status: "invalid_payload",
          },
        });
        return NextResponse.json({ error: "Missing order payload" }, { status: 400 });
      }
      const event = await feeLedgerEmitter({
        triggerEvent: "ORDER_PAID",
        eventType: "INSTALLER_ORDER_SERVICE_FEE",
        actorRole: "installer",
        actorId: body.installerId,
        relatedEntityType: "Order",
        relatedEntityId: body.orderId,
        baseAmount: Number(body.baseAmount),
        currency: body.currency,
        createdByRole: session.role === "admin" ? "admin" : "system",
        createdById: session.userId,
      });
      emitFeeEngineAuthorityObservation({
        session,
        subjectActorId: body.installerId,
        resource: "order",
        action: "fee_ledger.emit.order_paid",
        observedDecision: "WOULD_ALLOW",
        reasonCodes: ["FEE_EVENT_EMITTED"],
        metadata: {
          triggerEvent: body.triggerEvent,
          status: "success",
          eventId: event.eventId,
        },
      });
      return NextResponse.json({ ok: true, event });
    }

    emitFeeEngineAuthorityObservation({
      session,
      subjectActorId: "unknown_subject",
      resource: "fee_ledger.event",
      action: "emit",
      observedDecision: "WOULD_DENY",
      reasonCodes: ["TRIGGER_EVENT_UNSUPPORTED"],
      metadata: {
        status: "unsupported_trigger",
      },
    });
    return NextResponse.json({ error: "Unsupported trigger" }, { status: 400 });
  } catch (e: any) {
    emitFeeEngineAuthorityObservation({
      session,
      subjectActorId: "unknown_subject",
      resource: "fee_ledger.event",
      action: "emit",
      observedDecision: "WOULD_DENY",
      reasonCodes: [String(e?.message || "FEE_EVENT_CREATE_FAILED")],
      metadata: {
        status: "exception",
        triggerEvent: body.triggerEvent,
      },
    });
    return NextResponse.json({ error: e?.message || "Fee event creation failed" }, { status: 400 });
  }
}
