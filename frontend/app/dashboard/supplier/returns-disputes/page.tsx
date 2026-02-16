"use client";

import { useMemo } from "react";
import { getAdminDisputes, getOrders, getReturns, getSession } from "../../../../lib/store";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierReturnsDisputesPage() {
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const role = session?.role ?? "supplier";
  const { t } = useSupplierTranslations();
  const orders = useMemo(
    () =>
      getOrders().filter(
        (order) =>
          order.supplierIds?.includes(supplierId) || order.items.some((item) => item.supplierId === supplierId)
      ),
    [supplierId]
  );
  const orderIds = useMemo(() => new Set(orders.map((o) => o.orderId)), [orders]);

  const returns = useMemo(() => getReturns().filter((r) => orderIds.has(r.orderId)), [orderIds]);
  const disputes = useMemo(() => getAdminDisputes().filter((d) => orderIds.has(d.orderId)), [orderIds]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("returns.title")}</h1>
        <p className="text-sm text-muted">{t("returns.subtitle")}</p>
      </div>

      {role === "regulator" && (
        <div className="bg-brand-100 border border-brand-200 text-brand-700 rounded-xl px-4 py-2 text-sm font-semibold">
          {t("returns.readonly")}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("returns.summary.returns")}</div>
          <div className="text-lg font-semibold">{returns.length}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("returns.summary.disputes")}</div>
          <div className="text-lg font-semibold">{disputes.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
          <h2 className="text-lg font-semibold">{t("returns.section.returns.title")}</h2>
          {returns.length === 0 ? (
            <div className="text-sm text-muted">{t("returns.section.returns.empty")}</div>
          ) : (
            <div className="space-y-2">
              {returns.map((r) => (
                <div key={r.rmaId} className="border rounded-xl p-3 bg-surface-muted">
                  <div className="text-sm text-muted">{t("returns.section.returns.rma", { id: r.rmaId })}</div>
                  <div className="text-base font-semibold">{r.productName}</div>
                  <div className="text-xs text-muted">
                    {t("returns.section.returns.status", { status: r.status })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
          <h2 className="text-lg font-semibold">{t("returns.section.disputes.title")}</h2>
          {disputes.length === 0 ? (
            <div className="text-sm text-muted">{t("returns.section.disputes.empty")}</div>
          ) : (
            <div className="space-y-2">
              {disputes.map((d) => (
                <div key={d.id} className="border rounded-xl p-3 bg-surface-muted">
                  <div className="text-sm text-muted">{t("returns.section.disputes.order", { id: d.orderId })}</div>
                  <div className="text-base font-semibold">{d.reason}</div>
                  <div className="text-xs text-muted">{t("returns.section.disputes.status", { status: d.status })}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
