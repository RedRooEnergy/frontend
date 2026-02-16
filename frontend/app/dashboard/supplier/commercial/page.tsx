"use client";

import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierCommercialPage() {
  const { t } = useSupplierTranslations();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("commercial.title")}</h1>
        <p className="text-sm text-muted">{t("commercial.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("commercial.summary.requests")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("commercial.summary.quotes")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("commercial.summary.locked")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
      </div>
      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4 text-sm text-muted">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("commercial.overview.title")}</h2>
          <p>{t("commercial.overview.body")}</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("commercial.workflow.title")}</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>{t("commercial.workflow.step1")}</li>
            <li>{t("commercial.workflow.step2")}</li>
            <li>{t("commercial.workflow.step3")}</li>
            <li>{t("commercial.workflow.step4")}</li>
          </ol>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("commercial.governance.title")}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("commercial.governance.item1")}</li>
            <li>{t("commercial.governance.item2")}</li>
            <li>{t("commercial.governance.item3")}</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("commercial.applies.title")}</h2>
          <p>{t("commercial.applies.body")}</p>
        </section>
      </div>
    </div>
  );
}
