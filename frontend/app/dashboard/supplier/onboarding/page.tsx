"use client";

import Link from "next/link";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierOnboardingRedirectPage() {
  const { t } = useSupplierTranslations();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("onboarding.redirect.title")}</h1>
        <p className="text-sm text-muted">{t("onboarding.redirect.body")}</p>
      </div>
      <Link href="/dashboard/supplier/profile" className="text-brand-700 font-semibold text-sm">
        {t("onboarding.redirect.cta")}
      </Link>
    </div>
  );
}
