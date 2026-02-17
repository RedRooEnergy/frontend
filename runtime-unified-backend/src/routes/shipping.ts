import { Router } from "express";
import { writeAudit } from "../audit/auditStore";
import {
  createShipmentQuote,
  getShipmentById,
  selectShipmentQuote,
  type ShippingItem,
  type QuoteId,
} from "../shipping/shippingStore";

const router = Router();

function badRequest(code: string) {
  const err = new Error(code);
  (err as Error & { status?: number }).status = 400;
  return err;
}

function notFound(code: string) {
  const err = new Error(code);
  (err as Error & { status?: number }).status = 404;
  return err;
}

function conflict(code: string) {
  const err = new Error(code);
  (err as Error & { status?: number }).status = 409;
  return err;
}

function parseItems(value: unknown): ShippingItem[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw badRequest("INVALID_ITEMS");

  const out: ShippingItem[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") throw badRequest("INVALID_ITEM_ROW");
    const r = row as Record<string, unknown>;

    const sku = r.sku ? String(r.sku) : "";
    const quantity = Number(r.quantity);
    const weightKg =
      r.weightKg === undefined || r.weightKg === null || r.weightKg === ""
        ? undefined
        : Number(r.weightKg);

    if (!sku || sku.trim().length === 0) throw badRequest("MISSING_SKU");
    if (!Number.isInteger(quantity) || quantity <= 0) throw badRequest("INVALID_QUANTITY");
    if (weightKg !== undefined && (!Number.isFinite(weightKg) || weightKg < 0)) throw badRequest("INVALID_WEIGHT_KG");

    out.push({
      sku: sku.trim(),
      quantity,
      ...(weightKg !== undefined ? { weightKg } : {}),
    });
  }

  return out;
}

router.post("/quote", async (req, res, next) => {
  try {
    const { orderId, snapshotId, destination, items } = req.body as {
      orderId?: string;
      snapshotId?: string;
      destination?: { country?: string; state?: string; postcode?: string };
      items?: unknown;
    };

    if (!orderId || String(orderId).trim().length === 0) throw badRequest("MISSING_ORDER_ID");

    const created = await createShipmentQuote({
      orderId: String(orderId),
      snapshotId: snapshotId ? String(snapshotId) : undefined,
      destination: destination || undefined,
      items: parseItems(items),
    });

    await writeAudit({
      actorId: "system",
      actorRole: "system",
      action: "SHIPPING_QUOTE_CREATED",
      entityType: "Shipment",
      entityId: created.shipmentId,
      metadata: {
        orderId: created.orderId,
        snapshotId: created.snapshotId,
        status: created.status,
        quotes: created.quotes.map((q) => ({ quoteId: q.quoteId, costAUD: q.costAUD })),
      },
    });

    res.status(201).json({
      ok: true,
      shipmentId: created.shipmentId,
      status: created.status,
      orderId: created.orderId,
      snapshotId: created.snapshotId,
      destination: created.destination,
      quotes: created.quotes,
      selectedQuoteId: created.selectedQuoteId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/select", async (req, res, next) => {
  try {
    const { shipmentId, quoteId } = req.body as { shipmentId?: string; quoteId?: string };

    if (!shipmentId || String(shipmentId).trim().length === 0) throw badRequest("MISSING_SHIPMENT_ID");
    if (!quoteId || String(quoteId).trim().length === 0) throw badRequest("MISSING_QUOTE_ID");

    const q = String(quoteId).trim().toLowerCase() as QuoteId;
    if (q !== "std" && q !== "exp") throw badRequest("INVALID_QUOTE_ID");

    const selected = await selectShipmentQuote({ shipmentId: String(shipmentId), quoteId: q });

    if (selected.kind === "NOT_FOUND") throw notFound("SHIPMENT_NOT_FOUND");
    if (selected.kind === "INVALID_QUOTE") throw badRequest("INVALID_QUOTE_ID");
    if (selected.kind === "ALREADY_SELECTED") throw conflict("ALREADY_SELECTED");
    const shipment = selected.shipment;

    await writeAudit({
      actorId: "system",
      actorRole: "system",
      action: "SHIPPING_QUOTE_SELECTED",
      entityType: "Shipment",
      entityId: shipment.shipmentId,
      metadata: {
        selectedQuoteId: shipment.selectedQuoteId,
        status: shipment.status,
      },
    });

    res.status(200).json({
      ok: true,
      shipmentId: shipment.shipmentId,
      status: shipment.status,
      selectedQuoteId: shipment.selectedQuoteId,
      updatedAt: shipment.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/shipments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const shipment = await getShipmentById(String(id));

    if (!shipment) throw notFound("SHIPMENT_NOT_FOUND");

    res.status(200).json({
      shipmentId: shipment.shipmentId,
      status: shipment.status,
      orderId: shipment.orderId,
      snapshotId: shipment.snapshotId,
      destination: shipment.destination,
      quotes: shipment.quotes,
      selectedQuoteId: shipment.selectedQuoteId,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

export { router as shippingRouter };
export default router;
