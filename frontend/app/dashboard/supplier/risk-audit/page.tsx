"use client";

import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierRiskAuditPage() {
  const { t } = useSupplierTranslations();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("risk.title")}</h1>
        <p className="text-sm text-muted">{t("risk.subtitle")}</p>
      </div>
      <div className="bg-brand-100 border border-brand-200 text-brand-700 rounded-xl px-4 py-2 text-sm font-semibold">
        {t("risk.readonly")}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("risk.summary.flags")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("risk.summary.actions")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("risk.summary.audits")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
      </div>
      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4 text-sm text-muted">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("risk.overview.title")}</h2>
          <p>{t("risk.overview.body")}</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("risk.records.title")}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("risk.records.item1")}</li>
            <li>{t("risk.records.item2")}</li>
            <li>{t("risk.records.item3")}</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("risk.governance.title")}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("risk.governance.item1")}</li>
            <li>{t("risk.governance.item2")}</li>
            <li>{t("risk.governance.item3")}</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("risk.applies.title")}</h2>
          <p>{t("risk.applies.body")}</p>
        </section>
      </div>
    </div>
  );
}
