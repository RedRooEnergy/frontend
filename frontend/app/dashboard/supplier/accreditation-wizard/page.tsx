"use client";

import AccreditationWizard from "../../../../components/accreditation/AccreditationWizard";
import { supplierPhaseEnabled } from "../../../../lib/featureFlags";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierAccreditationWizardPage() {
  const enabled = supplierPhaseEnabled();
  const { t } = useSupplierTranslations();

  if (!enabled) {
    return (
      <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
        {t("phase.disabled.body")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-5xl mx-auto px-6 py-8">
        <AccreditationWizard />
      </main>
    </div>
  );
}
