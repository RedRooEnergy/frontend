"use client";
import { supplierPhaseEnabled } from "../../../../lib/featureFlags";
import {
  getSession,
  getSupplierProfiles,
  getShipmentUpdates,
  getSupplierProductStates,
} from "../../../../lib/store";
import { recordAudit } from "../../../../lib/audit";
import { useEffect } from "react";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

export default function SupplierPayoutReadinessPage() {
  const enabled = supplierPhaseEnabled();
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const { t } = useSupplierTranslations();

  const profile = getSupplierProfiles().find((p) => p.supplierId === supplierId);
  const shipments = getShipmentUpdates().filter((s) => s.supplierId === supplierId);
  const productStates = getSupplierProductStates().filter((s) => s.supplierId === supplierId);

  useEffect(() => {
    recordAudit("SUPPLIER_PAYOUT_READINESS_CHECKED", { supplierId });
  }, [supplierId]);

  if (!enabled) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
          {t("phase.disabled.body")}
        </div>
      </div>
    );
  }

  const gates = [
    {
      label: t("payout.gate.kyb.label"),
      pass: profile?.kybStatus === "verified",
      note: t("payout.gate.kyb.note"),
    },
    {
      label: t("payout.gate.beneficiary.label"),
      pass: profile?.beneficiaryName === profile?.kybLegalName && !!profile?.beneficiaryName,
      note: t("payout.gate.beneficiary.note"),
    },
    {
      label: t("payout.gate.aud.label"),
      pass: profile?.payoutCurrencies.includes("AUD") ?? false,
      note: t("payout.gate.aud.note"),
    },
    {
      label: t("payout.gate.rails.label"),
      pass: (profile?.paymentRails?.length ?? 0) > 0,
      note: t("payout.gate.rails.note"),
    },
    {
      label: t("payout.gate.disputes.label"),
      pass: true,
      note: t("payout.gate.disputes.note"),
    },
    {
      label: t("payout.gate.delivery.label"),
      pass: productStates.some((s) => s.state === "SETTLEMENT_ELIGIBLE" || s.state === "SETTLED"),
      note: t("payout.gate.delivery.note"),
    },
    {
      label: t("payout.gate.evidence.label"),
      pass: shipments.some((s) => s.milestone === "DELIVERED"),
      note: t("payout.gate.evidence.note"),
    },
  ];

  const ready = gates.every((g) => g.pass);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("payout.title")}</h1>
      <p className="text-sm text-muted">{t("payout.subtitle")}</p>

      <div className="bg-surface rounded-2xl shadow-card border p-5 space-y-3">
        {gates.map((gate) => (
          <div key={gate.label} className="flex items-start gap-3 border-b last:border-b-0 pb-3 last:pb-0">
            <div className="w-4 pt-1 text-sm">{gate.pass ? "✅" : "⛔"}</div>
            <div>
              <div className="text-sm font-semibold">{gate.label}</div>
              <div className="text-xs text-muted">{gate.note}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={`p-4 rounded-2xl border ${ready ? "border-green-500 text-green-700" : "border-amber-500 text-amber-700"}`}>
        {ready ? t("payout.ready") : t("payout.blocked")}
      </div>

      <p className="text-xs text-muted">
        {t("payout.forbidden")}
      </p>
    </div>
  );
}
