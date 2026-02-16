"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCompliancePartnersView } from "../../../../lib/compliancePartner/client";
import type { CompliancePartnerView } from "../../../../lib/compliancePartner/view";
import type { CompliancePartnerOffice } from "../../../../lib/compliancePartner/types";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

const DIRECTORY_IDS = new Set([
  "cp-saa-approvals",
  "cp-oz-cert",
  "cp-citation-group",
  "cp-sgs-au",
  "cp-tuv-au",
  "cp-ul-nz",
  "cp-global-mark",
]);

const BRISBANE_CITY = "brisbane";

function findBrisbaneOffice(offices?: CompliancePartnerOffice[]) {
  return offices?.find((office) => office.city?.toLowerCase() === BRISBANE_CITY);
}

function findNearestAuOffice(offices?: CompliancePartnerOffice[]) {
  if (!offices || offices.length === 0) return undefined;
  return (
    offices.find((office) => office.isNearestToBrisbane) ||
    offices.find((office) => office.country === "AU" && office.isPrimary) ||
    offices.find((office) => office.country === "AU") ||
    offices.find((office) => office.isPrimary) ||
    offices[0]
  );
}

function formatOffice(office?: CompliancePartnerOffice) {
  if (!office) return "";
  const parts = [office.addressLine, office.city, office.state, office.postcode, office.country].filter(Boolean);
  return parts.join(", ");
}

export default function SupplierCompliancePartnersPage() {
  const { t } = useSupplierTranslations();
  const [partners, setPartners] = useState<CompliancePartnerView[]>([]);
  const [loading, setLoading] = useState(true);
  const [brisbaneOnly, setBrisbaneOnly] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCompliancePartnersView()
      .then((items) => {
        if (active) setPartners(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const tableRows = useMemo(() => {
    return partners
      .filter((partner) => DIRECTORY_IDS.has(partner.id))
      .filter((partner) => (brisbaneOnly ? partner.brisbaneOffice : true))
      .map((partner) => {
        const brisbaneOffice = findBrisbaneOffice(partner.offices);
        const nearestOffice = brisbaneOffice ? undefined : findNearestAuOffice(partner.offices);
        const sourceUrl = brisbaneOffice?.sourceUrl || nearestOffice?.sourceUrl || partner.websiteUrl;
        return {
          id: partner.id,
          name: partner.name,
          brisbane: Boolean(brisbaneOffice),
          brisbaneAddress: formatOffice(brisbaneOffice),
          nearestAddress: formatOffice(nearestOffice),
          sourceUrl,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [partners, brisbaneOnly]);

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{t("compliancePartners.title")}</h1>
          <p className="text-sm text-muted">{t("compliancePartners.subtitle")}</p>
          <label className="inline-flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={brisbaneOnly}
              onChange={(event) => setBrisbaneOnly(event.target.checked)}
            />
            {t("compliancePartners.filter.brisbaneOnly")}
          </label>
        </div>

        <div className="border rounded-2xl bg-white shadow-card overflow-hidden">
          <div className="grid grid-cols-5 gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide bg-surface-muted text-muted">
            <div>{t("compliancePartners.table.company")}</div>
            <div>{t("compliancePartners.table.brisbane")}</div>
            <div>{t("compliancePartners.table.address")}</div>
            <div>{t("compliancePartners.table.nearest")}</div>
            <div>{t("compliancePartners.table.source")}</div>
          </div>

          {loading && (
            <div className="px-4 py-6 text-sm text-muted">{t("common.loading")}</div>
          )}

          {!loading && tableRows.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted">{t("compliancePartners.table.none")}</div>
          )}

          {tableRows.map((row) => (
            <div key={row.id} className="grid grid-cols-5 gap-2 px-4 py-3 border-t text-sm">
              <div className="font-semibold">{row.name}</div>
              <div>{row.brisbane ? t("compliancePartners.table.yes") : t("compliancePartners.table.no")}</div>
              <div>
                {row.brisbane
                  ? row.brisbaneAddress || t("compliancePartners.table.none")
                  : t("compliancePartners.table.none")}
              </div>
              <div>
                {!row.brisbane
                  ? row.nearestAddress || t("compliancePartners.table.none")
                  : t("compliancePartners.table.none")}
              </div>
              <div>
                {row.sourceUrl ? (
                  <a className="text-brand-700 underline" href={row.sourceUrl} target="_blank" rel="noreferrer">
                    {t("common.view")}
                  </a>
                ) : (
                  t("compliancePartners.table.none")
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
