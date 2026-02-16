"use client";

import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierSupportPage() {
  const { t } = useSupplierTranslations();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("support.title")}</h1>
        <p className="text-sm text-muted">{t("support.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("support.summary.open")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("support.summary.pending")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("support.summary.resolved")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
      </div>
      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4 text-sm text-muted">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("support.overview.title")}</h2>
          <p>{t("support.overview.body")}</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("support.coverage.title")}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("support.coverage.item1")}</li>
            <li>{t("support.coverage.item2")}</li>
            <li>{t("support.coverage.item3")}</li>
            <li>{t("support.coverage.item4")}</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("support.governance.title")}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("support.governance.item1")}</li>
            <li>{t("support.governance.item2")}</li>
            <li>{t("support.governance.item3")}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
