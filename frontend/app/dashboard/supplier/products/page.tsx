"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supplierPhaseEnabled } from "../../../../lib/featureFlags";
import {
  getSession,
  getSupplierProductRecords,
  removeSupplierProductRecord,
  setSupplierProductRecords,
  upsertSupplierProductRecord,
  SupplierProductRecord,
  SupplierProductStatus,
} from "../../../../lib/store";
import { categories } from "../../../../data/categories";
import { recordAudit } from "../../../../lib/audit";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

const TABS = [
  { id: "all", key: "products.tabs.all" },
  { id: "drafts", key: "products.tabs.drafts" },
  { id: "review", key: "products.tabs.review" },
  { id: "approved", key: "products.tabs.approved" },
  { id: "rejected", key: "products.tabs.rejected" },
];

const STATUS_FILTERS: Record<string, SupplierProductStatus[]> = {
  all: ["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"],
  drafts: ["DRAFT"],
  review: ["UNDER_REVIEW"],
  approved: ["APPROVED"],
  rejected: ["REJECTED", "SUSPENDED"],
};

export default function SupplierProductsPage() {
  const enabled = supplierPhaseEnabled();
  const router = useRouter();
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const { t } = useSupplierTranslations();
  const [activeTab, setActiveTab] = useState("all");
  const [records, setRecords] = useState<SupplierProductRecord[]>([]);

  useEffect(() => {
    const allRecords = getSupplierProductRecords();
    const existing = allRecords.filter((record) => record.supplierId === supplierId);
    if (existing.length === 0) {
      const now = new Date().toISOString();
      const seed: SupplierProductRecord[] = [
        {
          id: `draft-${Date.now()}`,
          supplierId,
          status: "DRAFT",
          name: t("products.seed.draftName"),
          categorySlug: "solar-pv-modules",
          subCategorySlug: "monocrystalline",
          attributes: {},
          imageFiles: [],
          certifications: {},
          certificationFeeCurrency: "AUD",
          complianceWorkflowStatus: "PENDING",
          completeness: 0,
          createdAt: now,
          updatedAt: now,
        },
      ];
      setSupplierProductRecords([...allRecords, ...seed]);
      setRecords(seed);
      return;
    }
    setRecords(existing);
  }, [supplierId, t]);

  const filtered = useMemo(() => {
    const allowed = STATUS_FILTERS[activeTab] || STATUS_FILTERS.all;
    return records.filter((record) => allowed.includes(record.status));
  }, [activeTab, records]);

  if (!enabled) {
    return (
      <div className="min-h-screen bg-surface-muted text-strong flex items-center justify-center">
        <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
          {t("phase.disabled.body")}
        </div>
      </div>
    );
  }

  const handleCreate = () => {
    const now = new Date().toISOString();
    const newRecord: SupplierProductRecord = {
      id: `draft-${Date.now()}`,
      supplierId,
      status: "DRAFT",
      name: t("products.seed.defaultName"),
      attributes: {},
      imageFiles: [],
      certifications: {},
      certificationFeeCurrency: "AUD",
      complianceWorkflowStatus: "PENDING",
      completeness: 0,
      createdAt: now,
      updatedAt: now,
    };
    upsertSupplierProductRecord(newRecord);
    setRecords((prev) => [...prev, newRecord]);
    recordAudit("SUPPLIER_PRODUCT_DRAFT_CREATED", { supplierId, productId: newRecord.id });
    router.push(`/dashboard/supplier/products/draft/${newRecord.id}`);
  };

  const handleDeleteDraft = (id: string) => {
    removeSupplierProductRecord(id);
    setRecords((prev) => prev.filter((record) => record.id !== id));
    recordAudit("SUPPLIER_PRODUCT_DRAFT_DELETED", { supplierId, productId: id });
  };

  const renderEmptyState = () => (
    <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">{t("products.empty")}</div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("products.title")}</h1>
        <p className="text-sm text-muted">{t("products.subtitle")}</p>
      </div>

      <div className="supplier-product-tabs" role="tablist" aria-label="Product status tabs">
        {TABS.map((tab) => {
          const count = records.filter((record) => STATUS_FILTERS[tab.id].includes(record.status)).length;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`supplier-product-tab ${isActive ? "is-active" : ""}`}
              aria-selected={isActive}
              role="tab"
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{t(tab.key)}</span>
              <span className="supplier-tab-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "drafts" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted">{t("products.drafts.helper")}</div>
          <button
            type="button"
            className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold"
            onClick={handleCreate}
          >
            {t("products.create")}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="supplier-table-card">
          <div className="supplier-table">
            <div className="supplier-table-header">
              <span>{t("products.table.product")}</span>
              <span>{t("products.table.category")}</span>
              <span>{t("products.table.status")}</span>
              <span>{t("products.table.completeness")}</span>
              <span>{t("products.table.updated")}</span>
              <span className="text-right">{t("products.table.action")}</span>
            </div>
            {filtered.map((record) => {
              const category = record.categorySlug
                ? t(`categories.${record.categorySlug}`)
                : t("products.notSet");
              const updated = new Date(record.updatedAt).toLocaleDateString();
              return (
                <div key={record.id} className="supplier-table-row">
                  <span className="font-semibold">{record.name}</span>
                  <span>{category}</span>
                  <span>{t(`status.${record.status}`)}</span>
                  <span>{record.completeness}%</span>
                  <span>{updated}</span>
                  <span className="text-right">
                    {record.status === "DRAFT" ? (
                      <>
                        <Link
                          href={`/dashboard/supplier/products/draft/${record.id}`}
                          className="text-brand-700 font-semibold"
                        >
                          {t("products.action.continue")}
                        </Link>
                        <button
                          type="button"
                          className="ml-3 text-xs text-red-600"
                          onClick={() => handleDeleteDraft(record.id)}
                        >
                          {t("products.action.delete")}
                        </button>
                      </>
                    ) : (
                      <Link
                        href={`/dashboard/supplier/products/draft/${record.id}`}
                        className="text-brand-700 font-semibold"
                      >
                        {t("products.action.view")}
                      </Link>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
