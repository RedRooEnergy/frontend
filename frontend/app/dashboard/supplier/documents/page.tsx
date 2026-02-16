"use client";

import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierDocumentsPage() {
  const { t } = useSupplierTranslations();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("documents.title")}</h1>
        <p className="text-sm text-muted">{t("documents.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("documents.summary.invoices")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("documents.summary.certificates")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("documents.summary.delivery")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("documents.summary.audit")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
      </div>
      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4 text-sm text-muted">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("documents.overview.title")}</h2>
          <p>{t("documents.overview.body")}</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("documents.includes.title")}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("documents.includes.item1")}</li>
            <li>{t("documents.includes.item2")}</li>
            <li>{t("documents.includes.item3")}</li>
            <li>{t("documents.includes.item4")}</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("documents.governance.title")}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("documents.governance.item1")}</li>
            <li>{t("documents.governance.item2")}</li>
            <li>{t("documents.governance.item3")}</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("documents.applies.title")}</h2>
          <p>{t("documents.applies.body")}</p>
        </section>
      </div>
    </div>
  );
}
