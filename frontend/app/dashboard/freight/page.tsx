"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FreightDashboardLayout from "../../../components/FreightDashboardLayout";
import {
  FreightException,
  getFreightExceptions,
  getSession,
  getShipmentUpdates,
  setShipmentUpdates,
  ShipmentMilestone,
  ShipmentUpdate,
} from "../../../lib/store";
import { formatDate } from "../../../lib/utils";

const milestoneProgress: Record<ShipmentMilestone, number> = {
  PICKUP: 20,
  EXPORT_CLEARANCE: 45,
  IN_TRANSIT: 70,
  DELIVERED: 100,
};

const milestoneLabel: Record<ShipmentMilestone, string> = {
  PICKUP: "Pickup confirmed",
  EXPORT_CLEARANCE: "Export clearance",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
};

function seedFreightUpdates(): ShipmentUpdate[] {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      id: crypto.randomUUID(),
      supplierId: "SUP-001",
      productSlug: "mono-module",
      milestone: "PICKUP",
      trackingId: "TRK-7781",
      evidenceNote: "Cargo collected from supplier warehouse",
      timestamp: new Date(now.getTime() - day).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      supplierId: "SUP-001",
      productSlug: "mono-module",
      milestone: "EXPORT_CLEARANCE",
      trackingId: "TRK-7781",
      evidenceNote: "Export clearance approved",
      timestamp: new Date(now.getTime() - day / 2).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      supplierId: "SUP-002",
      productSlug: "battery-pack",
      milestone: "IN_TRANSIT",
      trackingId: "TRK-5524",
      evidenceNote: "On vessel - ETA 7 days",
      timestamp: new Date(now.getTime() - day * 2).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      supplierId: "SUP-002",
      productSlug: "battery-pack",
      milestone: "PICKUP",
      trackingId: "TRK-5524",
      evidenceNote: "Collected at origin",
      timestamp: new Date(now.getTime() - day * 3).toISOString(),
    },
  ];
}

function groupShipments(updates: ShipmentUpdate[]) {
  const groups = new Map<string, ShipmentUpdate[]>();
  updates.forEach((update) => {
    const key = update.trackingId || update.id;
    const list = groups.get(key) || [];
    list.push(update);
    groups.set(key, list);
  });
  return Array.from(groups.entries()).map(([trackingId, list]) => {
    const sorted = list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latest = sorted[0];
    return {
      trackingId,
      productSlug: latest.productSlug,
      supplierId: latest.supplierId,
      milestone: latest.milestone,
      latestAt: latest.timestamp,
      notes: latest.evidenceNote,
    };
  });
}

export default function FreightOperationsPage() {
  const router = useRouter();
  const [updates, setUpdates] = useState<ShipmentUpdate[]>([]);
  const [exceptions, setExceptions] = useState<FreightException[]>([]);
  const [deliveryInputs, setDeliveryInputs] = useState<Record<string, { orderId: string; note: string }>>({});

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "freight") {
      router.replace("/signin?role=freight");
      return;
    }
    const existing = getShipmentUpdates();
    if (existing.length === 0) {
      const seeded = seedFreightUpdates();
      setShipmentUpdates(seeded);
      setUpdates(seeded);
    } else {
      setUpdates(existing);
    }
    setExceptions(getFreightExceptions());
  }, [router]);

  const shipments = useMemo(() => groupShipments(updates), [updates]);
  const openExceptions = exceptions.filter((e) => e.status !== "RESOLVED");

  const updateDeliveryInput = (key: string, field: "orderId" | "note", value: string) => {
    setDeliveryInputs((prev) => ({
      ...prev,
      [key]: {
        orderId: field === "orderId" ? value : prev[key]?.orderId || "",
        note: field === "note" ? value : prev[key]?.note || "",
      },
    }));
  };

  const confirmDelivery = async (key: string, trackingId?: string) => {
    const entry = deliveryInputs[key];
    const orderId = entry?.orderId?.trim();
    if (!orderId) {
      alert("Order ID is required to confirm delivery.");
      return;
    }
    const res = await fetch("/api/freight/delivery-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        trackingId,
        evidenceNote: entry?.note || "",
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || "Unable to confirm delivery.");
      return;
    }
    setDeliveryInputs((prev) => ({ ...prev, [key]: { orderId: "", note: "" } }));
    setUpdates(getShipmentUpdates());
  };

  return (
    <FreightDashboardLayout title="Freight Operations">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div>
            <div className="buyer-section-title">Shipment control centre</div>
            <p className="text-sm text-muted">Incoterms (DDP), routing, milestones, and exceptions.</p>
          </div>
          <span className="buyer-pill">DDP governed</span>
        </div>
        <div className="buyer-form-grid">
          <div className="buyer-card">
            <div className="text-xs text-muted">Active shipments</div>
            <div className="text-xl font-semibold">{shipments.length}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Open exceptions</div>
            <div className="text-xl font-semibold">{openExceptions.length}</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">DDP shipments</div>
            <div className="text-xl font-semibold">{shipments.length}</div>
          </div>
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Payment APIs</div>
          <div className="text-xs text-muted">Shipping, customs/duty, last-mile settlement</div>
        </div>
        <div className="buyer-form-grid">
          <div className="buyer-card">
            <div className="text-xs text-muted">Shipping payment</div>
            <div className="text-sm font-semibold">API ready</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Customs & duty</div>
            <div className="text-sm font-semibold">API ready</div>
          </div>
          <div className="buyer-card">
            <div className="text-xs text-muted">Last-mile delivery</div>
            <div className="text-sm font-semibold">API ready</div>
          </div>
        </div>
        <p className="text-xs text-muted mt-2">
          Payment triggers are governed by milestone completion. API integration will post settlement events into the
          audit log.
        </p>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Active shipment milestones</div>
          <div className="text-xs text-muted">Event-driven tracking</div>
        </div>
        {shipments.length === 0 ? (
          <p className="text-sm text-muted">No shipment updates yet.</p>
        ) : (
          <div className="space-y-3">
            {shipments.map((shipment) => {
              const key = shipment.trackingId || shipment.productSlug;
              const input = deliveryInputs[key] || { orderId: "", note: "" };
              const isDelivered = shipment.milestone === "DELIVERED";
              return (
              <div key={key} className="buyer-card">
                <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted">Tracking</div>
                    <div className="text-sm font-semibold">{shipment.trackingId || shipment.productSlug}</div>
                      <div className="text-xs text-muted">Supplier {shipment.supplierId}</div>
                    </div>
                  <div className="text-right">
                    <span className="buyer-pill">{milestoneLabel[shipment.milestone]}</span>
                    <div className="text-xs text-muted">{formatDate(shipment.latestAt)}</div>
                  </div>
                </div>
                <div className="mt-2 buyer-progress">
                  <div className="buyer-progress-bar" style={{ width: `${milestoneProgress[shipment.milestone]}%` }} />
                </div>
                {shipment.notes && <div className="text-xs text-muted mt-2">{shipment.notes}</div>}
                <div className="mt-3 border-t pt-3">
                  <div className="text-xs text-muted mb-2">Delivery confirmation</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      className="border rounded-md px-3 py-2 text-sm"
                      placeholder="Order ID"
                      value={input.orderId}
                      onChange={(event) => updateDeliveryInput(key, "orderId", event.target.value)}
                      disabled={isDelivered}
                    />
                    <input
                      className="border rounded-md px-3 py-2 text-sm"
                      placeholder="Evidence note (optional)"
                      value={input.note}
                      onChange={(event) => updateDeliveryInput(key, "note", event.target.value)}
                      disabled={isDelivered}
                    />
                    <button
                      onClick={() => confirmDelivery(key, shipment.trackingId)}
                      className={`px-3 py-2 rounded-md text-sm font-semibold ${
                        isDelivered ? "bg-gray-200 text-gray-500" : "bg-brand-700 text-brand-100"
                      }`}
                      disabled={isDelivered}
                    >
                      {isDelivered ? "Delivered" : "Confirm delivery"}
                    </button>
                  </div>
                </div>
              </div>
            );})}
          </div>
        )}
      </div>
    </FreightDashboardLayout>
  );
}
