"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supplierPhaseEnabled } from "../../../lib/featureFlags";
import { getSession, getSupplierProductRecords, getSupplierProfiles } from "../../../lib/store";
import { recordAudit } from "../../../lib/audit";
import { useSupplierTranslations } from "../../../lib/supplierI18n";

export default function SupplierDashboardPage() {
  const enabled = supplierPhaseEnabled();
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const { t } = useSupplierTranslations();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `rre-supplier-onboarding-ack:${supplierId}`;
    const seen = window.localStorage.getItem(key);
    if (!seen) {
      setShowOnboarding(true);
    }
  }, [supplierId]);

  if (!enabled) {
    return (
      <div className="bg-surface rounded-2xl shadow-card border p-6 space-y-3">
        <h1 className="text-xl font-bold">{t("phase.disabled.title")}</h1>
        <p className="text-sm text-muted">{t("phase.disabled.body")}</p>
      </div>
    );
  }

  const profiles = getSupplierProfiles();
  const profile = profiles.find((p) => p.supplierId === supplierId);
  const productRecords = getSupplierProductRecords().filter((record) => record.supplierId === supplierId);
  const draftCount = productRecords.filter((record) => record.status === "DRAFT").length;
  const reviewCount = productRecords.filter((record) => record.status === "UNDER_REVIEW").length;
  const approvedCount = productRecords.filter((record) => record.status === "APPROVED").length;
  const complianceHealth = productRecords.some((record) => record.status === "REJECTED" || record.status === "SUSPENDED")
    ? "Amber"
    : "Green";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          title={t("dashboard.accountStatus")}
          value={profile ? t("dashboard.accountActive") : t("dashboard.accountReview")}
          link="/dashboard/supplier/profile"
          description={t("dashboard.card.onboarding")}
        />
        <Card
          title={t("dashboard.complianceHealth")}
          value={complianceHealth === "Green" ? t("dashboard.complianceGreen") : t("dashboard.complianceAmber")}
          link="/dashboard/supplier/products"
          description={t("dashboard.card.compliance")}
        />
        <Card
          title={t("dashboard.ordersFulfilment")}
          value={t("dashboard.ordersActive")}
          link="/dashboard/supplier/payout-readiness"
          description={t("dashboard.card.orders")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickLink title={t("dashboard.quick.drafts", { count: draftCount })} href="/dashboard/supplier/products" />
        <QuickLink title={t("dashboard.quick.review", { count: reviewCount })} href="/dashboard/supplier/products" />
        <QuickLink title={t("dashboard.quick.approved", { count: approvedCount })} href="/dashboard/supplier/products" />
        <QuickLink title={t("dashboard.quick.payout")} href="/dashboard/supplier/payout-readiness" />
      </div>

      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface rounded-2xl shadow-card border max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{t("onboarding.modal.title")}</h2>
              <p className="text-sm text-muted">{t("onboarding.modal.subtitle")}</p>
            </div>

            <div className="space-y-3 text-sm text-muted">
              <p>{t("onboarding.welcome.p1")}</p>
              <p>{t("onboarding.welcome.p2")}</p>
              <p className="font-semibold text-strong">{t("onboarding.welcome.bullets.title")}</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t("onboarding.welcome.bullet1")}</li>
                <li>{t("onboarding.welcome.bullet2")}</li>
                <li>{t("onboarding.welcome.bullet3")}</li>
                <li>{t("onboarding.welcome.bullet4")}</li>
              </ul>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.who.title")}</h3>
              <p>{t("onboarding.who.p1")}</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t("onboarding.who.bullet1")}</li>
                <li>{t("onboarding.who.bullet2")}</li>
                <li>{t("onboarding.who.bullet3")}</li>
                <li>{t("onboarding.who.bullet4")}</li>
              </ul>
              <p>{t("onboarding.who.p2")}</p>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.flow.title")}</h3>
              <ol className="list-decimal pl-5 space-y-1">
                <li>{t("onboarding.flow.step1")}</li>
                <li>{t("onboarding.flow.step2")}</li>
                <li>{t("onboarding.flow.step3")}</li>
                <li>{t("onboarding.flow.step4")}</li>
                <li>{t("onboarding.flow.step5")}</li>
                <li>{t("onboarding.flow.step6")}</li>
                <li>{t("onboarding.flow.step7")}</li>
              </ol>
              <p>{t("onboarding.flow.p1")}</p>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.dashboard.title")}</h3>
              <p>{t("onboarding.dashboard.is")}</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t("onboarding.dashboard.is.bullet1")}</li>
                <li>{t("onboarding.dashboard.is.bullet2")}</li>
                <li>{t("onboarding.dashboard.is.bullet3")}</li>
              </ul>
              <p>{t("onboarding.dashboard.not")}</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t("onboarding.dashboard.not.bullet1")}</li>
                <li>{t("onboarding.dashboard.not.bullet2")}</li>
                <li>{t("onboarding.dashboard.not.bullet3")}</li>
              </ul>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.upload.title")}</h3>
              <p className="font-semibold text-strong">{t("onboarding.upload.step1.title")}</p>
              <p>{t("onboarding.upload.step1.body")}</p>
              <p className="font-semibold text-strong">{t("onboarding.upload.step2.title")}</p>
              <p>{t("onboarding.upload.step2.body")}</p>
              <p className="font-semibold text-strong">{t("onboarding.upload.step3.title")}</p>
              <p>{t("onboarding.upload.step3.body")}</p>
              <p className="font-semibold text-strong">{t("onboarding.upload.step4.title")}</p>
              <p>{t("onboarding.upload.step4.body")}</p>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.partner.title")}</h3>
              <p>{t("onboarding.partner.body")}</p>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.approval.title")}</h3>
              <p>{t("onboarding.approval.body")}</p>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.admin.title")}</h3>
              <p>{t("onboarding.admin.body")}</p>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.pricing.title")}</h3>
              <p className="font-semibold text-strong">{t("onboarding.pricing.nocommission.title")}</p>
              <p>{t("onboarding.pricing.nocommission.body")}</p>
              <p className="font-semibold text-strong">{t("onboarding.pricing.ddp.title")}</p>
              <p>{t("onboarding.pricing.ddp.body")}</p>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.marketing.title")}</h3>
              <p>{t("onboarding.marketing.body")}</p>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.after.title")}</h3>
              <p>{t("onboarding.after.body")}</p>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.success.title")}</h3>
              <p>{t("onboarding.success.body")}</p>

              <h3 className="text-base font-semibold text-strong">{t("onboarding.final.title")}</h3>
              <p>{t("onboarding.final.body")}</p>
              <p className="font-semibold text-strong">{t("onboarding.final.welcome")}</p>
              <h3 className="text-base font-semibold text-strong">{t("onboarding.i18n.title")}</h3>
              <p className="text-xs text-muted whitespace-pre-line">{t("onboarding.i18n.body")}</p>
              <p className="text-xs text-muted">{t("onboarding.legal.footnote")}</p>
            </div>

            <div className="border-t pt-4 space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                <span>{t("onboarding.acknowledge")}</span>
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-5 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold disabled:opacity-50"
                  disabled={!acknowledged}
                  onClick={() => {
                    const key = `rre-supplier-onboarding-ack:${supplierId}`;
                    window.localStorage.setItem(key, new Date().toISOString());
                    recordAudit("SUPPLIER_ONBOARDING_ACKNOWLEDGED", { supplierId });
                    setShowOnboarding(false);
                  }}
                >
                  {t("onboarding.acknowledge.button")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  description,
  link,
}: {
  title: string;
  value: string;
  description: string;
  link: string;
}) {
  const { t } = useSupplierTranslations();
  return (
    <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
      <div className="text-sm text-muted">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
      <p className="text-sm text-muted">{description}</p>
      <Link href={link} className="text-brand-700 font-semibold text-sm">
        {t("common.open")}
      </Link>
    </div>
  );
}

function QuickLink({ title, href }: { title: string; href: string }) {
  const { t } = useSupplierTranslations();
  return (
    <Link href={href} className="bg-surface rounded-2xl shadow-card border p-4 flex items-center justify-between">
      <div>
        <div className="text-base font-semibold">{title}</div>
        <div className="text-sm text-muted">{t("dashboard.quick.description")}</div>
      </div>
      <span className="text-brand-700 font-semibold text-sm">{t("common.open")}</span>
    </Link>
  );
}
