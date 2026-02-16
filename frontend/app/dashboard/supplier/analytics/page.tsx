"use client";

import { useMemo } from "react";
import { getOrders, getSession } from "../../../../lib/store";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierAnalyticsPage() {
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const { t } = useSupplierTranslations();
  const orders = useMemo(
    () =>
      getOrders().filter(
        (order) =>
          order.supplierIds?.includes(supplierId) || order.items.some((item) => item.supplierId === supplierId)
      ),
    [supplierId]
  );

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const delivered = orders.filter((order) => order.status === "DELIVERED" || order.status === "SETTLED").length;
  const fulfilmentRate = orders.length ? Math.round((delivered / orders.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("analytics.title")}</h1>
        <p className="text-sm text-muted">{t("analytics.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("analytics.card.revenue")}</div>
          <div className="text-lg font-semibold">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("analytics.card.delivered")}</div>
          <div className="text-lg font-semibold">{delivered}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("analytics.card.fulfilment")}</div>
          <div className="text-lg font-semibold">{fulfilmentRate}%</div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
        <h2 className="text-lg font-semibold">{t("analytics.recent.title")}</h2>
        {orders.length === 0 ? (
          <div className="text-sm text-muted">{t("analytics.recent.empty")}</div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 6).map((order) => (
              <div key={order.orderId} className="border rounded-xl p-3 bg-surface-muted">
                <div className="text-sm text-muted">{t("analytics.order.label", { id: order.orderId })}</div>
                <div className="text-base font-semibold">${order.total.toFixed(2)}</div>
                <div className="text-xs text-muted">
                  {t("analytics.order.status", {
                    status:
                      order.status === "DELIVERED" || order.status === "SETTLED"
                        ? t("orders.status.delivered")
                        : order.status === "SHIPPED"
                          ? t("orders.status.inTransit")
                          : order.status === "PROCESSING" || order.status === "PAID"
                            ? t("orders.status.processing")
                            : t("orders.status.pending"),
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
