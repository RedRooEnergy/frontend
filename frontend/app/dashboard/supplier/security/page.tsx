"use client";

import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierSecurityPage() {
  const { t } = useSupplierTranslations();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("security.title")}</h1>
        <p className="text-sm text-muted">{t("security.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("security.summary.mfa")}</div>
          <div className="text-lg font-semibold">{t("security.summary.enabled")}</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("security.summary.sessions")}</div>
          <div className="text-lg font-semibold">1</div>
        </div>
        <div className="bg-surface rounded-xl p-3 shadow-card border">
          <div className="text-muted">{t("security.summary.alerts")}</div>
          <div className="text-lg font-semibold">0</div>
        </div>
      </div>
      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-4 text-sm text-muted">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("security.overview.title")}</h2>
          <p>{t("security.overview.body")}</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("security.controls.title")}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("security.controls.item1")}</li>
            <li>{t("security.controls.item2")}</li>
            <li>{t("security.controls.item3")}</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-strong">{t("security.governance.title")}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("security.governance.item1")}</li>
            <li>{t("security.governance.item2")}</li>
            <li>{t("security.governance.item3")}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
