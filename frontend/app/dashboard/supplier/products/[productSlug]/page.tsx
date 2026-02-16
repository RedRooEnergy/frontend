"use client";

import Link from "next/link";
import { useSupplierTranslations } from "../../../../../lib/supplierI18n";

export default function SupplierProductLegacyPage() {
  const { t } = useSupplierTranslations();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("products.legacy.title")}</h1>
        <p className="text-sm text-muted">{t("products.legacy.body")}</p>
      </div>
      <Link href="/dashboard/supplier/products" className="text-brand-700 font-semibold text-sm">
        {t("products.legacy.cta")}
      </Link>
    </div>
  );
}
