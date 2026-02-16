"use client";
import { useState } from "react";
import { supplierPhaseEnabled } from "../../../../lib/featureFlags";
import {
  getSession,
  getShipmentUpdates,
  setShipmentUpdates,
  ShipmentMilestone,
  getSupplierProductStates,
} from "../../../../lib/store";
import { recordAudit } from "../../../../lib/audit";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

const ORDER_FLOW: ShipmentMilestone[] = ["PICKUP", "EXPORT_CLEARANCE", "IN_TRANSIT", "DELIVERED"];

export default function SupplierShipmentsPage() {
  const enabled = supplierPhaseEnabled();
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const role = session?.role ?? "supplier";
  const canUpdate = role === "admin";
  const { t } = useSupplierTranslations();
  const [milestone, setMilestone] = useState<ShipmentMilestone>("PICKUP");
  const [productSlug, setProductSlug] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");

  if (!enabled) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
          {t("phase.disabled.body")}
        </div>
      </div>
    );
  }

  const updates = getShipmentUpdates().filter((u) => u.supplierId === supplierId);
  const productStates = getSupplierProductStates().filter((s) => s.supplierId === supplierId);

  const activeShipments = productStates.length;
  const deliveredShipments = updates.filter((u) => u.milestone === "DELIVERED").length;
  const inTransitShipments = updates.filter((u) => u.milestone === "IN_TRANSIT").length;

  const nextAllowedMilestone = (slug: string): ShipmentMilestone => {
    const history = updates.filter((u) => u.productSlug === slug).map((u) => u.milestone);
    const lastIndex = Math.max(-1, ...history.map((m) => ORDER_FLOW.indexOf(m)));
    return ORDER_FLOW[Math.min(lastIndex + 1, ORDER_FLOW.length - 1)];
  };

  const addUpdate = () => {
    if (!productSlug) {
      alert(t("shipments.alert.productRequired"));
      return;
    }
    const expected = nextAllowedMilestone(productSlug);
    if (milestone !== expected) {
      alert(t("shipments.alert.nextAllowed", { milestone: t(`shipments.milestone.${expected}`) }));
      return;
    }
    const now = new Date().toISOString();
    const entry = {
      id: crypto.randomUUID(),
      supplierId,
      productSlug,
      milestone,
      trackingId,
      evidenceNote,
      timestamp: now,
    };
    const list = [...getShipmentUpdates(), entry];
    setShipmentUpdates(list);
    recordAudit("SUPPLIER_SHIPMENT_UPDATE_RECORDED", { productSlug, milestone });
    fetch("/api/freight/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId,
        productSlug,
        milestone,
        trackingId,
      }),
    }).catch((err) => console.error("Freight email notify failed", err));
    setTrackingId("");
    setEvidenceNote("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("shipments.title")}</h1>
        <p className="text-sm text-muted">{t("shipments.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("shipments.summary.active")}</div>
          <div className="text-lg font-semibold">{activeShipments}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("shipments.summary.inTransit")}</div>
          <div className="text-lg font-semibold">{inTransitShipments}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("shipments.summary.delivered")}</div>
          <div className="text-lg font-semibold">{deliveredShipments}</div>
        </div>
      </div>

      {canUpdate ? (
        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("shipments.field.productSlug")}</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={productSlug}
                onChange={(e) => setProductSlug(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("shipments.field.trackingId")}</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("shipments.field.milestone")}</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={milestone}
              onChange={(e) => setMilestone(e.target.value as ShipmentMilestone)}
            >
              {ORDER_FLOW.map((m) => (
                <option key={m} value={m}>
                  {t(`shipments.milestone.${m}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("shipments.field.evidence")}</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
            />
          </div>
          <button onClick={addUpdate} className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold">
            {t("shipments.add")}
          </button>
          <p className="text-xs text-muted">{t("shipments.forbidden")}</p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl shadow-card border p-4 text-sm text-muted">
          {t("shipments.readonly")}
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
        <h2 className="text-lg font-semibold">{t("shipments.history.title")}</h2>
        <div className="grid grid-cols-5 text-xs font-semibold text-muted px-2">
          <span>{t("shipments.history.product")}</span>
          <span>{t("shipments.history.milestone")}</span>
          <span>{t("shipments.history.tracking")}</span>
          <span>{t("shipments.history.timestamp")}</span>
          <span>{t("shipments.history.evidence")}</span>
        </div>
        {updates
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
          .map((u) => (
            <div key={u.id} className="grid grid-cols-5 text-sm px-2 py-2 border-b last:border-b-0">
              <span>{u.productSlug}</span>
              <span>{t(`shipments.milestone.${u.milestone}`)}</span>
              <span>{u.trackingId || t("common.none")}</span>
              <span>{new Date(u.timestamp).toLocaleString()}</span>
              <span className="text-xs text-muted">{u.evidenceNote || t("common.none")}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
