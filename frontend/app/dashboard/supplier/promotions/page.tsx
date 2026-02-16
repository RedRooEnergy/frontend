"use client";

import { useMemo } from "react";
import { getSession, getSupplierOverrides } from "../../../../lib/store";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierPromotionsPage() {
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const role = session?.role ?? "supplier";
  const { t } = useSupplierTranslations();
  const overrides = useMemo(
    () => getSupplierOverrides().filter((o) => o.supplierId === supplierId),
    [supplierId]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("promotions.title")}</h1>
        <p className="text-sm text-muted">{t("promotions.subtitle")}</p>
      </div>

      {role !== "supplier" && (
        <div className="bg-brand-100 border border-brand-200 text-brand-700 rounded-xl px-4 py-2 text-sm font-semibold">
          {t("promotions.readonly")}
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-surface-muted rounded-xl p-3">
            <div className="text-muted">{t("promotions.metrics.active")}</div>
            <div className="text-lg font-semibold">{overrides.length}</div>
          </div>
          <div className="bg-surface-muted rounded-xl p-3">
            <div className="text-muted">{t("promotions.metrics.weekly")}</div>
            <div className="text-lg font-semibold">
              {overrides.filter((o) => o.weeklyDeal?.nominated).length}
            </div>
          </div>
          <div className="bg-surface-muted rounded-xl p-3">
            <div className="text-muted">{t("promotions.metrics.governed")}</div>
            <div className="text-lg font-semibold">{t("promotions.metrics.enabled")}</div>
          </div>
        </div>

        {overrides.length === 0 ? (
          <div className="text-sm text-muted">{t("promotions.empty")}</div>
        ) : (
          <div className="space-y-2">
            {overrides.map((override) => (
              <div key={override.productSlug} className="border rounded-xl p-3 bg-surface-muted">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm text-muted">{t("promotions.product.label")}</div>
                    <div className="text-base font-semibold">{override.productSlug}</div>
                    <div className="text-xs text-muted">
                      {t("promotions.price.label", {
                        price: override.price ? `$${override.price.toFixed(2)}` : t("common.none"),
                        original: override.originalPrice ? `$${override.originalPrice.toFixed(2)}` : t("common.none"),
                      })}
                    </div>
                  </div>
                  <span className="text-xs text-muted">
                    {override.weeklyDeal?.nominated ? t("promotions.weekly.nominated") : t("promotions.standard")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
