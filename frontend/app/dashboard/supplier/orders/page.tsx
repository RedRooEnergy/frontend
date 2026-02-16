"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getOrders, getSession, getShipmentUpdates } from "../../../../lib/store";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierOrdersPage() {
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const { t } = useSupplierTranslations();
  const orders = getOrders();
  const shipments = getShipmentUpdates().filter((s) => s.supplierId === supplierId);

  const supplierOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.supplierIds?.includes(supplierId) || order.items.some((item) => item.supplierId === supplierId)
    );
  }, [orders, supplierId]);

  const processingCount = supplierOrders.filter(
    (order) => order.status === "PROCESSING" || order.status === "PAID"
  ).length;
  const inTransitCount = supplierOrders.filter((order) => order.status === "SHIPPED").length;
  const customsCount = supplierOrders.filter((order) => order.status === "PROCESSING").length;
  const deliveredCount = supplierOrders.filter(
    (order) => order.status === "DELIVERED" || order.status === "SETTLED"
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("orders.title")}</h1>
        <p className="text-sm text-muted">{t("orders.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("orders.summary.active")}</div>
          <div className="text-lg font-semibold">{supplierOrders.length}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("orders.summary.processing")}</div>
          <div className="text-lg font-semibold">{processingCount}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("orders.summary.inTransit")}</div>
          <div className="text-lg font-semibold">{inTransitCount}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("orders.summary.customs")}</div>
          <div className="text-lg font-semibold">{customsCount}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("orders.summary.delivered")}</div>
          <div className="text-lg font-semibold">{deliveredCount}</div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("orders.table.title")}</h2>
          <Link href="/dashboard/supplier/shipments" className="text-sm text-brand-700 font-semibold">
            {t("orders.updateShipments")}
          </Link>
        </div>
        <div className="grid grid-cols-6 text-xs font-semibold text-muted px-2">
          <span>{t("orders.table.orderId")}</span>
          <span>{t("orders.table.status")}</span>
          <span>{t("orders.table.ddpStage")}</span>
          <span>{t("orders.table.shipment")}</span>
          <span>{t("orders.table.total")}</span>
          <span>{t("orders.table.updated")}</span>
        </div>
        {supplierOrders.length === 0 ? (
          <div className="text-sm text-muted">{t("orders.empty")}</div>
        ) : (
          supplierOrders.map((order) => {
            const milestone = shipments.find((s) => order.items.some((i) => i.productSlug === s.productSlug));
            const isCompleted = order.status === "DELIVERED" || order.status === "SETTLED";
            const statusLabel =
              order.status === "DELIVERED" || order.status === "SETTLED"
                ? t("orders.status.delivered")
                : order.status === "SHIPPED"
                  ? t("orders.status.inTransit")
                  : order.status === "PROCESSING" || order.status === "PAID"
                    ? t("orders.status.processing")
                    : t("orders.status.pending");
            const ddpStageLabel =
              order.status === "DELIVERED" || order.status === "SETTLED"
                ? t("orders.ddp.lastMile")
                : order.status === "SHIPPED"
                  ? t("orders.ddp.freight")
                  : order.status === "PROCESSING" || order.status === "PAID"
                    ? t("orders.ddp.customs")
                    : t("orders.ddp.placed");
            return (
              <div key={order.orderId} className="grid grid-cols-6 text-sm px-2 py-2 border-b last:border-b-0">
                <span className="font-semibold">{order.orderId}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <span>{statusLabel}</span>
                  {isCompleted && <span className="buyer-pill">{t("orders.badge.completed")}</span>}
                </span>
                <span>{ddpStageLabel}</span>
                <span>
                  {milestone?.milestone ? t(`shipments.milestone.${milestone.milestone}`) : t("orders.shipment.notStarted")}
                </span>
                <span>{order.total.toFixed(2)}</span>
                <span className="text-xs text-muted">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
