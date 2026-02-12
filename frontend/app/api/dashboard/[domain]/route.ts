import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "../../../../lib/auth/request";
import { forbidden, handleApiError, unauthorized } from "../../../../lib/api/http";
import {
  confirmInstallerJob,
  createBuyerOrder,
  createMarketingEmail,
  createPromotion,
  listDashboardData,
  releaseSettlement,
  updateFreightShipment,
  updatePricingRule,
  upsertSupplierProduct,
} from "../../../../lib/api/dashboardService";
import type { DashboardDomain } from "../../../../lib/rbac/types";

const DOMAINS: DashboardDomain[] = ["buyer", "supplier", "freight", "installer", "admin", "finance", "ceo", "marketing", "regulator"];

function isDomain(value: string): value is DashboardDomain {
  return DOMAINS.includes(value as DashboardDomain);
}

export async function GET(request: NextRequest, context: { params: { domain: string } }) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();
  const { domain } = context.params;
  if (!isDomain(domain)) {
    return NextResponse.json({ error: "Unknown dashboard domain" }, { status: 404 });
  }
  try {
    const payload = listDashboardData(actor, domain);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: { params: { domain: string } }) {
  const actor = getActorFromRequest(request);
  if (!actor) return unauthorized();
  if (actor.role === "RRE_REGULATOR") {
    return forbidden("RRE_REGULATOR is read-only and cannot perform mutations");
  }
  const { domain } = context.params;
  if (!isDomain(domain)) {
    return NextResponse.json({ error: "Unknown dashboard domain" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { operation?: string; payload?: Record<string, any> };
  const operation = body.operation || "";
  const payload = body.payload || {};

  try {
    if (domain === "buyer" && operation === "createOrder") {
      const created = createBuyerOrder(actor, {
        supplierId: String(payload.supplierId || ""),
        amount: Number(payload.amount || 0),
      });
      return NextResponse.json({ result: created }, { status: 201 });
    }
    if (domain === "supplier" && operation === "upsertProduct") {
      const row = upsertSupplierProduct(actor, {
        productId: payload.productId ? String(payload.productId) : undefined,
        sku: String(payload.sku || ""),
        name: String(payload.name || ""),
      });
      return NextResponse.json({ result: row });
    }
    if (domain === "freight" && operation === "updateShipment") {
      const row = updateFreightShipment(actor, String(payload.shipmentId || ""), payload.state);
      return NextResponse.json({ result: row });
    }
    if (domain === "installer" && operation === "confirmInstallation") {
      const row = confirmInstallerJob(actor, String(payload.confirmationId || ""));
      return NextResponse.json({ result: row });
    }
    if (domain === "finance" && operation === "releaseSettlement") {
      const row = releaseSettlement(actor, String(payload.settlementId || ""));
      return NextResponse.json({ result: row });
    }
    if (domain === "finance" && operation === "updatePricingRule") {
      const row = updatePricingRule(actor, String(payload.pricingRuleId || ""), Number(payload.multiplier || 0));
      return NextResponse.json({ result: row });
    }
    if (domain === "marketing" && operation === "createPromotion") {
      const row = createPromotion(actor, String(payload.code || ""));
      return NextResponse.json({ result: row }, { status: 201 });
    }
    if (domain === "marketing" && operation === "createEmail") {
      const row = createMarketingEmail(actor, String(payload.subject || ""));
      return NextResponse.json({ result: row }, { status: 201 });
    }
    return NextResponse.json({ error: "Unsupported operation for domain" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
