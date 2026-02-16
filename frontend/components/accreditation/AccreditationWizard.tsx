"use client";

import { useMemo, useState } from "react";
import { categories } from "../../data/categories";
import { accreditationAgents } from "../../data/accreditationAgents";
import { getAccreditationRecommendations } from "../../data/accreditationMapping";
import AgentRecommendationCard from "./AgentRecommendationCard";
import CategorySubcategorySelector from "./CategorySubcategorySelector";
import { useSupplierTranslations } from "../../lib/supplierI18n";

export default function AccreditationWizard() {
  const { t, locale } = useSupplierTranslations();
  const [categorySlug, setCategorySlug] = useState("");
  const [subCategorySlug, setSubCategorySlug] = useState("");

  const recommendations = useMemo(
    () => getAccreditationRecommendations(categorySlug, subCategorySlug),
    [categorySlug, subCategorySlug]
  );

  const labels = useMemo(
    () => ({
      categoryLabel: t("wizard.category.label"),
      subCategoryLabel: t("wizard.subcategory.label"),
      selectCategory: t("wizard.selectCategory"),
      selectSubCategory: t("wizard.selectSubcategory"),
      categoryNames: (slug: string) => t(`categories.${slug}`),
      subCategoryNames: (slug: string) => t(`subcategories.${slug}`),
    }),
    [t]
  );

  const isoAgents = accreditationAgents.filter((agent) => ["GLOBALMARK", "CITATION"].includes(agent.code));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("wizard.title")}</h1>
        <p className="text-sm text-muted">{t("wizard.subtitle")}</p>
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-4">
        <CategorySubcategorySelector
          categories={categories}
          categorySlug={categorySlug}
          subCategorySlug={subCategorySlug}
          onCategoryChange={(next) => {
            setCategorySlug(next);
            setSubCategorySlug("");
          }}
          onSubCategoryChange={setSubCategorySlug}
          labels={labels}
        />
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-4">
        <div>
          <div className="text-sm font-semibold">{t("wizard.recommendations.title")}</div>
          <p className="text-xs text-muted">{t("wizard.recommendations.subtitle")}</p>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-sm text-muted">{t("wizard.recommendations.none")}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec) => (
              <AgentRecommendationCard
                key={`${rec.agent.code}-${rec.reason.en}`}
                agent={rec.agent}
                reason={rec.reason}
                locale={locale}
              />
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-muted border-b">
                  <th className="py-2 pr-4">{t("wizard.table.agent")}</th>
                  <th className="py-2 pr-4">{t("wizard.table.reason")}</th>
                  <th className="py-2">{t("wizard.table.website")}</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec) => (
                  <tr key={`${rec.agent.code}-row`} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 font-semibold">{rec.agent.name}</td>
                    <td className="py-2 pr-4 text-muted">
                      {locale === "zh-CN" ? rec.reason.zh : rec.reason.en}
                    </td>
                    <td className="py-2">
                      <a
                        href={rec.agent.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-700 underline"
                      >
                        {locale === "zh-CN" ? "打开" : "Open"}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-2">
        <div className="text-sm font-semibold">{t("wizard.companyNote")}</div>
        <p className="text-xs text-muted">{t("wizard.companyNoteDetail")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {isoAgents.map((agent) => (
            <AgentRecommendationCard
              key={agent.code}
              agent={agent}
              reason={{
                en: "ISO company certification (not product approval).",
                zh: "ISO公司体系认证（非产品认证）。",
              }}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
