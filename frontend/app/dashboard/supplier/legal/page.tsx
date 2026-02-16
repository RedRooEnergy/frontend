"use client";

import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierLegalPage() {
  const { t } = useSupplierTranslations();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("legal.title")}</h1>
        <p className="text-sm text-muted">{t("legal.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("legal.summary.policies")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("legal.summary.acknowledged")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("legal.summary.updates")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
      </div>
      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4 text-sm text-muted">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("legal.overview.title")}</h2>
          <p>{t("legal.overview.body")}</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("legal.documents.title")}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("legal.documents.item1")}</li>
            <li>{t("legal.documents.item2")}</li>
            <li>{t("legal.documents.item3")}</li>
            <li>{t("legal.documents.item4")}</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("legal.ack.title")}</h2>
          <p>{t("legal.ack.body")}</p>
        </section>
      </div>
    </div>
  );
}
