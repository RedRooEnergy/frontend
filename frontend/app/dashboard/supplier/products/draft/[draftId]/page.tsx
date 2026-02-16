"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { categories } from "../../../../../../data/categories";
import { fetchCompliancePartnersView } from "../../../../../../lib/compliancePartner/client";
import type { CompliancePartnerView } from "../../../../../../lib/compliancePartner/view";
import { getCertificationRequirements } from "../../../../../../data/certificationMatrix";
import { getAccreditationRecommendations } from "../../../../../../data/accreditationMapping";
import AgentRecommendationCard from "../../../../../../components/accreditation/AgentRecommendationCard";
import { applyTransition } from "../../../../../../lib/compliance/workflowStateMachine";
import { getNumericRule } from "../../../../../../data/fieldValidation";
import { FormField, FormSection, getProductFormSections } from "../../../../../../data/productFormSchema";
import {
  getSession,
  getSupplierProductRecords,
  upsertSupplierProductRecord,
  SupplierProductRecord,
  CertificationRecord,
} from "../../../../../../lib/store";
import { recordAudit } from "../../../../../../lib/audit";
import { supplierPhaseEnabled } from "../../../../../../lib/featureFlags";
import { useSupplierTranslations } from "../../../../../../lib/supplierI18n";

const IMAGE_SLOTS = 6;

export default function SupplierProductDraftPage({ params }: { params: { draftId: string } }) {
  const router = useRouter();
  const enabled = supplierPhaseEnabled();
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const { t, locale } = useSupplierTranslations();
  const [record, setRecord] = useState<SupplierProductRecord | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [linkStatus, setLinkStatus] = useState<"ACTIVE" | "PENDING" | "NONE">("NONE");
  const [linkLoading, setLinkLoading] = useState(false);
  const [cecValidation, setCecValidation] = useState<{ status: "idle" | "checking" | "passed" | "failed" | "unavailable"; message?: string }>({
    status: "idle",
  });
  const [partners, setPartners] = useState<CompliancePartnerView[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [brisbaneOnly, setBrisbaneOnly] = useState(false);

  useEffect(() => {
    const existing = getSupplierProductRecords().find((entry) => entry.id === params.draftId);
    if (!existing) {
      return;
    }
    setRecord(existing);
  }, [params.draftId]);

  useEffect(() => {
    const partnerId = record?.compliancePartnerId;
    if (!partnerId) {
      setLinkStatus("NONE");
      return;
    }
    const loadLink = async () => {
      setLinkLoading(true);
      try {
        const res = await fetch(`/api/supplier/service-partner-links?servicePartnerId=${partnerId}`);
        const data = await res.json();
        if (data?.link?.status === "ACTIVE") setLinkStatus("ACTIVE");
        else if (data?.link?.status === "PENDING") setLinkStatus("PENDING");
        else setLinkStatus("NONE");
      } catch {
        setLinkStatus("NONE");
      } finally {
        setLinkLoading(false);
      }
    };
    loadLink();
  }, [record?.compliancePartnerId]);

  useEffect(() => {
    let active = true;
    fetchCompliancePartnersView()
      .then((items) => {
        if (active) setPartners(items);
      })
      .finally(() => {
        if (active) setPartnersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.slug, label: t(`categories.${category.slug}`) })),
    [t]
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === record?.categorySlug),
    [record?.categorySlug]
  );

  const subCategoryOptions = useMemo(
    () =>
      selectedCategory?.subcategories.map((subcategory) => ({
        value: subcategory.slug,
        label: t(`subcategories.${subcategory.slug}`),
      })) ?? [],
    [selectedCategory, t]
  );

  const sections = useMemo<FormSection[]>(() => {
    if (!record?.categorySlug) return [];
    return getProductFormSections(record.categorySlug);
  }, [record?.categorySlug]);

  const translatedSections = useMemo<FormSection[]>(
    () =>
      sections.map((section) => {
        const key = `form.section.${section.id}.title`;
        const translated = t(key);
        return {
          ...section,
          title: translated === key ? section.title : translated,
        };
      }),
    [sections, t]
  );

  useEffect(() => {
    if (!activeSectionId) {
      if (sections.length > 0) {
        setActiveSectionId(sections[0].id);
        return;
      }
      setActiveSectionId("category");
    }
  }, [activeSectionId, sections]);

  const requiredFields = useMemo<FormField[]>(
    () => sections.flatMap((section) => section.fields).filter((field) => field.required && !field.readOnly),
    [sections]
  );

  const cecProductType = useMemo(() => {
    if (!record?.categorySlug) return null;
    if (record.categorySlug === "solar-pv-modules") return "pv_module";
    if (record.categorySlug === "inverters-power-electronics") return "inverter";
    if (record.categorySlug === "energy-storage-batteries") return "battery";
    return null;
  }, [record?.categorySlug]);

  const derivedValues = useMemo(() => {
    const completion = record?.completeness ?? 0;
    const statusLabel = record?.status ? t(`status.${record.status}`) : t("status.DRAFT");
    return {
      identity_product_category: record?.categorySlug ? t(`categories.${record.categorySlug}`) : "",
      identity_product_subcategory:
        record?.subCategorySlug ? t(`subcategories.${record.subCategorySlug}`) : "",
      declarations_submission_timestamp: record?.updatedAt ?? t("draft.platform.notSubmitted"),
      platform_completeness_score: `${completion}%`,
      platform_compliance_status: t("draft.platform.pendingValidation"),
      platform_ddp_eligibility: t("draft.platform.notConfirmed"),
      platform_audit_readiness: completion === 100 ? t("draft.platform.ready") : t("draft.platform.pending"),
      platform_approval_status: statusLabel,
      platform_rejection_reason:
        record?.status === "REJECTED" ? t("draft.platform.reviewRequired") : t("draft.platform.none"),
      platform_version_history: record?.updatedAt
        ? t("draft.platform.lastUpdated", { timestamp: record.updatedAt })
        : t("draft.platform.noSubmissions"),
      platform_change_log_hash: simpleHash(JSON.stringify(record?.attributes ?? {})).slice(0, 12),
      platform_final_confirmation: record?.supplierApprovalSigned
        ? t("draft.platform.declarationsComplete")
        : t("draft.platform.pendingDeclarations"),
    };
  }, [record, t]);

  const missingRequired = useMemo(() => {
    if (!record) return [];
    return requiredFields.filter((field) => {
      const value = field.key in derivedValues ? derivedValues[field.key as keyof typeof derivedValues] : record.attributes[field.key];
      return !isValueFilled(field, value as string | number | boolean | undefined);
    });
  }, [record, requiredFields, derivedValues]);

  const numericErrors = useMemo(() => {
    if (!record) return {};
    const errors: Record<string, string> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.type !== "number") return;
        const rule = getNumericRule(field.key);
        if (!rule) return;
        const raw = record.attributes[field.key];
        if (raw === "" || raw === undefined || raw === null) return;
        const value = typeof raw === "number" ? raw : Number(raw);
        if (Number.isNaN(value)) return;
        if (value < rule.min || value > rule.max) {
          errors[field.key] = t("validation.range", {
            min: rule.min,
            max: rule.max,
            unit: rule.unit ? ` ${rule.unit}` : "",
          });
        }
      });
    });
    return errors;
  }, [record, sections, t]);

  const invalidNumbers = Object.keys(numericErrors);

  const completenessPercent = useMemo(() => {
    if (requiredFields.length === 0) return 0;
    return Math.round(((requiredFields.length - missingRequired.length) / requiredFields.length) * 100);
  }, [requiredFields, missingRequired]);

  const fieldLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        const key = `form.field.${field.key}.label`;
        const translated = t(key);
        map.set(field.key, translated === key ? field.label : translated);
      });
    });
    return map;
  }, [sections, t]);

  const updateRecord = useCallback(
    (updates: Partial<SupplierProductRecord>) => {
      if (!record) return;
      const next: SupplierProductRecord = {
        ...record,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      upsertSupplierProductRecord(next);
      setRecord(next);
    },
    [record]
  );

  useEffect(() => {
    if (!record) return;
    if (record.completeness !== completenessPercent) {
      updateRecord({ completeness: completenessPercent });
    }
  }, [completenessPercent, record, updateRecord]);

  const handleAttrChange = (key: string, value: string | number | boolean) => {
    if (!record) return;
    const nextAttributes = { ...record.attributes, [key]: value };
    const nextName =
      key === "identity_product_commercial_name" && typeof value === "string" && value.trim().length > 0
        ? value
        : record.name;
    updateRecord({ attributes: nextAttributes, name: nextName });
  };

  const handleImageChange = (index: number, file?: File) => {
    if (!record) return;
    const nextImages = [...record.imageFiles];
    nextImages[index] = file?.name ?? "";
    updateRecord({ imageFiles: nextImages });
  };

  const updateCertification = (cert: string, updates: Partial<CertificationRecord>) => {
    if (!record) return;
    const key = cert.toLowerCase() as keyof SupplierProductRecord["certifications"];
    updateRecord({
      certifications: {
        ...record.certifications,
        [key]: {
          ...(record.certifications[key] ?? {}),
          ...updates,
        },
      },
    });
  };

  if (!enabled) {
    return (
      <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
        {t("phase.disabled.body")}
      </div>
    );
  }

  if (!record) {
    return (
      <div className="bg-surface rounded-2xl shadow-card border p-6 text-sm text-muted">
        {t("draft.notFound")}
      </div>
    );
  }

  const isLocked =
    record.status !== "DRAFT" || record.partnerReviewStatus === "pending" || record.partnerReviewStatus === "pass";
  const certificationMatrix = getCertificationRequirements(record.categorySlug ?? "", record.subCategorySlug);
  const requiredCertList = certificationMatrix.required;
  const cecRequired = requiredCertList.includes("CEC");
  const imageCount = record.imageFiles.filter(Boolean).length;
  const imagesComplete = imageCount === IMAGE_SLOTS;

  const certComplete = requiredCertList.every((cert) => isCertificationComplete(record, cert));
  const partnerSelected = Boolean(record.compliancePartnerId);
  const supplierApproved = Boolean(record.supplierApprovalSigned && record.supplierApprovalName);
  const partnerReviewPass = record.partnerReviewStatus === "pass";
  const partnerStatusKey = record.partnerReviewStatus ?? "not_started";
  const partnerStatusLabel = t(`draft.partner.status.${partnerStatusKey}`);
  const statusLabel = t(`status.${record.status}`);

  const missingRequiredLabels = missingRequired.map((field) => fieldLabelMap.get(field.key) ?? field.label);
  const invalidNumberLabels = invalidNumbers.map((key) => fieldLabelMap.get(key) ?? key);

  const formComplete =
    Boolean(record.categorySlug && record.subCategorySlug) && missingRequired.length === 0 && invalidNumbers.length === 0;
  const canRequestReview = formComplete && imagesComplete && certComplete && partnerSelected && linkStatus === "ACTIVE";
  const canSubmit = formComplete && imagesComplete && certComplete && partnerSelected && supplierApproved && partnerReviewPass;

  const partnerPool = brisbaneOnly ? partners.filter((partner) => partner.brisbaneOffice) : partners;
  const filteredPartners = partnerPool.filter((partner) =>
    requiredCertList.every((cert) => partner.certifications.includes(cert))
  );
  const recommendedPartners = filteredPartners
    .map((partner) => {
      let score = 0;
      if (partner.status === "Available") score += 4;
      if (partner.status === "Limited") score += 2;
      score += Math.max(0, 12 - partner.slaDays);
      if (partner.focusCategories?.includes(record.categorySlug ?? "")) score += 3;
      return { partner, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ partner }) => partner);
  const categoryLabel = record.categorySlug ? t(`categories.${record.categorySlug}`) : "";
  const accreditationRecommendations = getAccreditationRecommendations(record.categorySlug, record.subCategorySlug);

  const validateCec = async () => {
    if (!cecRequired) return { ok: true as const };
    if (!cecProductType) {
      const message = "CEC validation requires a supported product category.";
      setCecValidation({ status: "failed", message });
      return { ok: false as const, message };
    }
    const modelNumber = String(record.attributes.identity_manufacturer_sku || "").trim();
    const manufacturerName = String(
      record.attributes.identity_supplier_legal_name ||
        record.attributes.identity_supplier_trading_name ||
        ""
    ).trim();
    if (!modelNumber) {
      const message = "Manufacturer SKU / model number is required for CEC validation.";
      setCecValidation({ status: "failed", message });
      return { ok: false as const, message };
    }
    setCecValidation({ status: "checking", message: "Checking CEC approved list…" });
    try {
      const params = new URLSearchParams({
        productType: cecProductType,
        modelNumber,
      });
      if (manufacturerName) params.set("manufacturerName", manufacturerName);
      const res = await fetch(`/api/cec/validate?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        const message = json?.error || "CEC validation unavailable.";
        setCecValidation({ status: "unavailable", message });
        return { ok: false as const, message };
      }
      if (!json.matched) {
        const message = "CEC approved listing not found for this model.";
        setCecValidation({ status: "failed", message });
        return { ok: false as const, message };
      }
      setCecValidation({ status: "passed", message: "CEC approval confirmed." });
      return { ok: true as const };
    } catch (error: any) {
      const message = error?.message || "CEC validation failed.";
      setCecValidation({ status: "unavailable", message });
      return { ok: false as const, message };
    }
  };

  const customSections: Array<{ id: string; title: string; content: ReactNode; missing?: number }> = [
    {
      id: "category",
      title: t("draft.category.title"),
      content: (
        <div className="supplier-fields-grid supplier-fields-grid--product">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              {t("draft.category.category")} <span className="text-red-600">*</span>
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={record.categorySlug ?? ""}
              onChange={(event) => {
                const nextCategory = event.target.value;
                const nextRecord = {
                  categorySlug: nextCategory,
                  subCategorySlug: "",
                };
                updateRecord(nextRecord);
              }}
              disabled={isLocked}
            >
              <option value="">{t("draft.selectCategory")}</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              {t("draft.category.subcategory")} <span className="text-red-600">*</span>
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={record.subCategorySlug ?? ""}
              onChange={(event) => updateRecord({ subCategorySlug: event.target.value })}
              disabled={!record.categorySlug || isLocked}
            >
              <option value="">{t("draft.selectSubcategory")}</option>
              {subCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="supplier-span-2 text-xs text-muted">
            {t("draft.category.requirements", {
              required: requiredCertList.length ? requiredCertList.join(", ") : t("common.none"),
            })}
          </div>
        </div>
      ),
      missing: record.categorySlug && record.subCategorySlug ? 0 : 1,
    },
  ];

  const categoryDependentSections: Array<{ id: string; title: string; content: ReactNode; missing?: number }> = [
    {
      id: "images",
      title: t("draft.images.title"),
      content: (
        <div className="supplier-fields-grid supplier-fields-grid--product">
          {Array.from({ length: IMAGE_SLOTS }).map((_, index) => (
            <div key={index} className="space-y-1">
              <label className="text-sm font-medium">{t("draft.images.label", { index: index + 1 })}</label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm"
                onChange={(event) => handleImageChange(index, event.target.files?.[0])}
                disabled={isLocked}
              />
              {record.imageFiles[index] && (
                <div className="text-xs text-muted">
                  {t("draft.storedFile", { file: record.imageFiles[index] })}
                </div>
              )}
            </div>
          ))}
          <div className="supplier-span-2 text-xs text-muted">
            {imagesComplete
              ? t("draft.images.complete")
              : t("draft.images.remaining", { count: IMAGE_SLOTS - imageCount })}
          </div>
        </div>
      ),
      missing: imagesComplete ? 0 : IMAGE_SLOTS - imageCount,
    },
    {
      id: "certifications",
      title: t("draft.certifications.title"),
      content: (
        <div className="space-y-4">
          {requiredCertList.length === 0 && (
            <div className="text-sm text-muted">{t("draft.certifications.none")}</div>
          )}
          {requiredCertList.map((cert) => (
            <div key={cert} className="supplier-section-block">
              <h3 className="text-sm font-semibold">
                {t("draft.certifications.documentation", { cert })}
              </h3>
              <div className="supplier-fields-grid supplier-fields-grid--product mt-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    {t("draft.certifications.certificateNumber")} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={record.certifications[cert.toLowerCase() as keyof typeof record.certifications]?.certificateNumber ?? ""}
                    onChange={(event) =>
                      updateCertification(cert, { certificateNumber: event.target.value })
                    }
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    {t("draft.certifications.issuingBody")} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={record.certifications[cert.toLowerCase() as keyof typeof record.certifications]?.issuingBody ?? ""}
                    onChange={(event) => updateCertification(cert, { issuingBody: event.target.value })}
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    {t("draft.certifications.expiryDate")} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={record.certifications[cert.toLowerCase() as keyof typeof record.certifications]?.expiryDate ?? ""}
                    onChange={(event) => updateCertification(cert, { expiryDate: event.target.value })}
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-1 supplier-span-2">
                  <label className="text-sm font-medium">
                    {t("draft.certifications.upload")} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="w-full text-sm"
                    onChange={(event) => updateCertification(cert, { fileName: event.target.files?.[0]?.name })}
                    disabled={isLocked}
                  />
                  {record.certifications[cert.toLowerCase() as keyof typeof record.certifications]?.fileName && (
                    <div className="text-xs text-muted">
                      {t("draft.storedFile", {
                        file: record.certifications[cert.toLowerCase() as keyof typeof record.certifications]?.fileName ?? "",
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {requiredCertList.length > 0 && (
            <div className="text-xs text-muted">
              {certComplete ? t("draft.certifications.complete") : t("draft.certifications.incomplete")}
            </div>
          )}
        </div>
      ),
      missing: certComplete ? 0 : 1,
    },
    {
      id: "partner",
      title: t("draft.partner.title"),
      content: (
        <div className="space-y-3">
          <div className="supplier-fields-grid supplier-fields-grid--product">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t("draft.partner.select")} <span className="text-red-600">*</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-muted mb-2">
                <input
                  type="checkbox"
                  checked={brisbaneOnly}
                  onChange={(event) => setBrisbaneOnly(event.target.checked)}
                />
                {t("draft.partner.brisbaneOnly")}
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={record.compliancePartnerId ?? ""}
                onChange={(event) => updateRecord({ compliancePartnerId: event.target.value })}
                disabled={isLocked}
              >
                <option value="">{t("draft.partner.select")}</option>
                {partnersLoading && <option value="">{t("common.loading")}</option>}
                {filteredPartners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {t("draft.partner.option", {
                      name: partner.name,
                      sla: partner.slaDays,
                      location: partner.location,
                    })}
                    {partner.brisbaneOffice ? ` · ${t("common.brisbaneOffice")}` : ""}
                  </option>
                ))}
            </select>
            </div>
            {recommendedPartners.length > 0 && (
              <div className="space-y-2 text-xs text-muted supplier-span-2">
                <div className="font-semibold text-slate-700">{t("draft.partner.recommendedTitle")}</div>
                <div>{t("draft.partner.recommendedSubtitle", { certs: requiredCertList.join(", ") || t("common.none") })}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {recommendedPartners.map((partner) => {
                    const focusText = partner.focusCategories?.includes(record.categorySlug ?? "")
                      ? t("draft.partner.recommendedFocus", { category: categoryLabel })
                      : t("draft.partner.recommendedFocusGeneral");
                    return (
                        <div key={partner.id} className="border rounded-md p-2 bg-white">
                        <div className="font-semibold text-slate-700">{partner.name}</div>
                        {partner.brisbaneOffice && (
                          <div className="text-[10px] uppercase text-emerald-700">{t("common.brisbaneOffice")}</div>
                        )}
                        <div className="text-xs text-muted">
                          {focusText} · {t("draft.partner.recommendedSla", { sla: partner.slaDays })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("draft.partner.status")}</label>
              <div className="text-sm text-muted">{partnerStatusLabel}</div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("draft.partner.linkStatus")}</label>
              <div className="text-sm text-muted">
                {linkLoading
                  ? t("draft.partner.linkStatusLoading")
                  : linkStatus === "ACTIVE"
                  ? t("draft.partner.linkStatusActive")
                  : linkStatus === "PENDING"
                  ? t("draft.partner.linkStatusPending")
                  : t("draft.partner.linkStatusMissing")}
              </div>
              {linkStatus !== "ACTIVE" && (
                <button
                  type="button"
                  className="mt-2 px-3 py-2 text-xs font-semibold border rounded-md"
                  disabled={linkLoading || !record?.compliancePartnerId}
                  onClick={async () => {
                    if (!record?.compliancePartnerId) return;
                    try {
                      setLinkLoading(true);
                      const res = await fetch("/api/supplier/service-partner-links", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ servicePartnerId: record.compliancePartnerId }),
                      });
                      const data = await res.json();
                      if (data?.link?.status === "ACTIVE") {
                        setLinkStatus("ACTIVE");
                      } else {
                        setLinkStatus("PENDING");
                      }
                    } catch {
                      setLinkStatus("NONE");
                    } finally {
                      setLinkLoading(false);
                    }
                  }}
                >
                  {t("draft.partner.linkAction")}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold disabled:opacity-50"
              disabled={!canRequestReview || record.partnerReviewStatus === "pending" || isLocked}
              onClick={() => {
                updateRecord({
                  partnerReviewStatus: "pending",
                  partnerReviewRequestedAt: new Date().toISOString(),
                });
                recordAudit("SUPPLIER_PARTNER_REVIEW_REQUESTED", { supplierId, productId: record.id });
              }}
            >
              {t("draft.partner.send")}
            </button>
          </div>
          <div className="text-xs text-muted">
            {t("draft.partner.notice")}
          </div>
          {partnerSelected && linkStatus !== "ACTIVE" && (
            <div className="text-xs text-amber-700">
              {t("draft.partner.linkRequired")}
            </div>
          )}
          <div className="border-t pt-4 space-y-2">
            <div className="text-sm font-semibold">{t("draft.accreditation.title")}</div>
            <div className="text-xs text-muted">{t("draft.accreditation.subtitle")}</div>
            {accreditationRecommendations.length === 0 ? (
              <div className="text-xs text-muted">{t("draft.accreditation.none")}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {accreditationRecommendations.map((rec) => (
                  <AgentRecommendationCard
                    key={`${rec.agent.code}-draft`}
                    agent={rec.agent}
                    reason={rec.reason}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ),
      missing: partnerSelected ? 0 : 1,
    },
    {
      id: "approval",
      title: t("draft.approval.title"),
      content: (
        <div className="space-y-3">
          <div className="supplier-fields-grid supplier-fields-grid--product">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t("draft.approval.name")} <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={record.supplierApprovalName ?? ""}
                onChange={(event) => updateRecord({ supplierApprovalName: event.target.value })}
                disabled={isLocked}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={record.supplierApprovalSigned ?? false}
                onChange={(event) =>
                  updateRecord({
                    supplierApprovalSigned: event.target.checked,
                    supplierApprovalAt: event.target.checked ? new Date().toISOString() : undefined,
                  })
                }
                disabled={isLocked}
              />
              <span>{t("draft.approval.checkbox")}</span>
            </label>
          </div>
          <div className="text-xs text-muted">
            {t("draft.approval.notice")}
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold disabled:opacity-50"
            disabled={!canSubmit || record.status !== "DRAFT"}
            onClick={async () => {
              const cecCheck = await validateCec();
              if (!cecCheck.ok) {
                alert(cecCheck.message || "CEC validation failed. Please verify the approved listing.");
                return;
              }
              try {
                applyTransition(
                  record.complianceWorkflowState ?? "DRAFT",
                  "SUBMITTED",
                  "MANUFACTURER",
                  {
                    workflowId: record.id,
                    productId: record.id,
                    supplierId,
                    compliancePartnerId: record.compliancePartnerId || undefined,
                  }
                );
              } catch (error: any) {
                alert(error?.message || "Submission is not allowed in the current compliance state.");
                return;
              }
              updateRecord({
                status: "UNDER_REVIEW",
                complianceWorkflowStatus: "PENDING",
                complianceWorkflowState: "SUBMITTED",
              });
              recordAudit("SUPPLIER_PRODUCT_SUBMITTED", {
                supplierId,
                productId: record.id,
                nextState: "SUBMITTED",
              });
              router.push("/dashboard/supplier/products");
            }}
          >
            {t("draft.submit")}
          </button>
          {cecRequired && (
            <div className="text-xs text-muted">
              CEC validation required. Status:{" "}
              <span className={cecValidation.status === "passed" ? "text-green-700" : "text-amber-700"}>
                {cecValidation.message || "Pending validation"}
              </span>
            </div>
          )}
          {!canSubmit && (
            <div className="text-xs text-muted">
              {t("common.submissionLocked")}
            </div>
          )}
        </div>
      ),
      missing: canSubmit ? 0 : 1,
    },
  ];

  const allSections = [
    ...customSections.map((section) => ({
      id: section.id,
      title: section.title,
      description: undefined,
      fields: [] as FormField[],
      customContent: section.content,
      missingCount: section.missing ?? 0,
    })),
    ...(record.categorySlug
      ? categoryDependentSections.map((section) => ({
          id: section.id,
          title: section.title,
          description: undefined,
          fields: [] as FormField[],
          customContent: section.content,
          missingCount: section.missing ?? 0,
        }))
      : []),
    ...translatedSections.map((section) => ({
      ...section,
      customContent: null as ReactNode | null,
      missingCount: section.fields.filter(
        (field) =>
          field.required &&
          !field.readOnly &&
          !isValueFilled(field, record.attributes[field.key] as string | number | boolean | undefined)
      ).length,
      })),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("draft.title")}</h1>
        <p className="text-sm text-muted">
          {t("draft.meta", { id: record.id, status: statusLabel })}
        </p>
      </div>
      <button
        type="button"
        className="text-sm font-semibold text-brand-700"
        onClick={() => router.push("/dashboard/supplier/products")}
      >
        {t("draft.back")}
      </button>
      {isLocked && (
        <div className="bg-surface rounded-2xl shadow-card border p-4 text-sm text-muted">
          {t("draft.locked", { status: statusLabel })}
        </div>
      )}

      <div className="supplier-form-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted">{t("products.table.product")}</div>
            <div className="text-lg font-semibold">
              {record.attributes["identity_product_commercial_name"]?.toString() || record.name}
            </div>
          </div>
          <div className="text-xs text-muted">
            {t("draft.completion", {
              percent: completenessPercent,
              completed: requiredFields.length - missingRequired.length,
              total: requiredFields.length,
            })}
          </div>
        </div>

        <div className="supplier-form-tabs supplier-form-tabs--sticky" role="tablist" aria-label="Product form sections">
          {allSections.map((section) => {
            const isActive = section.id === activeSectionId;
            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`supplier-form-tab ${isActive ? "is-active" : ""}`}
                onClick={() => setActiveSectionId(section.id)}
              >
                <span>{section.title}</span>
                {section.missingCount > 0 && <span className="supplier-tab-badge">{section.missingCount}</span>}
              </button>
            );
          })}
        </div>
        {(missingRequired.length > 0 || invalidNumbers.length > 0) && (
          <div className="text-xs text-muted space-y-1">
            {missingRequired.length > 0 && (
              <div>
                {t("draft.missing", {
                  fields: missingRequiredLabels.slice(0, 4).join(", "),
                })}
                {missingRequired.length > 4 ? "..." : ""}
              </div>
            )}
            {invalidNumbers.length > 0 && (
              <div>
                {t("draft.numeric", { fields: invalidNumberLabels.slice(0, 3).join(", ") })}
                {invalidNumbers.length > 3 ? "..." : ""}
              </div>
            )}
          </div>
        )}

        {(() => {
          const activeSection = allSections.find((section) => section.id === activeSectionId);
          const activeIndex = allSections.findIndex((section) => section.id === activeSectionId);
          if (!activeSection) return null;
          return (
            <div className="space-y-4">
              <div className="supplier-section">
                <div className="supplier-section-header">
                  <div className="flex flex-col">
                    <span>{activeSection.title}</span>
                    <span className="text-xs text-muted">
                      {t("draft.sectionIndex", { index: activeIndex + 1, total: allSections.length })}
                    </span>
                  </div>
                  {activeSection.missingCount > 0 && (
                    <span className="supplier-tab-badge">{activeSection.missingCount}</span>
                  )}
                </div>
                <div className="supplier-section-body">
                  {activeSection.description && (
                    <div className="text-xs text-muted mb-3">{activeSection.description}</div>
                  )}
                  {activeSection.customContent ? (
                    activeSection.customContent
                  ) : (
                    <div className="supplier-fields-grid supplier-fields-grid--product">
                      {activeSection.fields.map((field) =>
                        renderField(field, record, derivedValues, handleAttrChange, isLocked, numericErrors, t)
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border border-brand-200 text-brand-700 rounded-md font-semibold disabled:opacity-50"
                  onClick={() => setActiveSectionId(allSections[Math.max(activeIndex - 1, 0)].id)}
                  disabled={activeIndex <= 0}
                >
                  {t("draft.sectionPrev")}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold disabled:opacity-50"
                  onClick={() => setActiveSectionId(allSections[Math.min(activeIndex + 1, allSections.length - 1)].id)}
                  disabled={activeIndex >= allSections.length - 1}
                >
                  {t("draft.sectionNext")}
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );

}

function renderField(
  field: FormField,
  record: SupplierProductRecord,
  derivedValues: Record<string, string>,
  handleAttrChange: (key: string, value: string | number | boolean) => void,
  locked: boolean,
  numericErrors: Record<string, string>,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  const value =
    field.key in derivedValues ? derivedValues[field.key as keyof typeof derivedValues] : record.attributes[field.key];
  const fieldId = `field-${field.key}`;
  const requiredMark = field.required ? <span className="text-red-600"> *</span> : null;
  const readOnly = Boolean(field.readOnly) || locked;
  const labelKey = `form.field.${field.key}.label`;
  const placeholderKey = `form.field.${field.key}.placeholder`;
  const labelText = (() => {
    const translated = t(labelKey);
    return translated === labelKey ? field.label : translated;
  })();
  const placeholderText = (() => {
    const translated = t(placeholderKey);
    if (translated === placeholderKey) {
      return field.placeholder ?? "";
    }
    return translated;
  })();
  const numericRule = field.type === "number" ? getNumericRule(field.key) : undefined;
  const numericError = numericErrors[field.key];

  if (field.type === "boolean") {
    return (
      <label key={field.key} className={`flex items-center gap-2 text-sm ${field.fullWidth ? "supplier-span-2" : ""}`}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => !readOnly && handleAttrChange(field.key, event.target.checked)}
          disabled={readOnly}
        />
        <span>
          {labelText}
          {requiredMark}
        </span>
      </label>
    );
  }

  if (field.type === "file") {
    return (
      <div key={field.key} className={`space-y-1 ${field.fullWidth ? "supplier-span-2" : ""}`}>
        <label htmlFor={fieldId} className="text-sm font-medium">
          {labelText}
          {requiredMark}
        </label>
        <input
          id={fieldId}
          type="file"
          className="w-full text-sm"
          onChange={(event) => {
            if (readOnly) return;
            const file = event.target.files?.[0];
            handleAttrChange(field.key, file ? file.name : "");
          }}
          disabled={readOnly}
        />
        {typeof value === "string" && value && (
          <div className="text-xs text-muted">{t("draft.storedFile", { file: value })}</div>
        )}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div key={field.key} className={`space-y-1 ${field.fullWidth ? "supplier-span-2" : ""}`}>
        <label htmlFor={fieldId} className="text-sm font-medium">
          {labelText}
          {requiredMark}
        </label>
        <textarea
          id={fieldId}
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[96px]"
          value={typeof value === "string" ? value : value === undefined ? "" : String(value)}
          onChange={(event) => !readOnly && handleAttrChange(field.key, event.target.value)}
          readOnly={readOnly}
          placeholder={placeholderText}
        />
      </div>
    );
  }

  if (field.type === "select") {
    const selectOptions =
      field.options && field.options.length > 0
        ? field.options
        : readOnly && typeof value === "string" && value
          ? [value]
          : [];
    return (
      <div key={field.key} className={`space-y-1 ${field.fullWidth ? "supplier-span-2" : ""}`}>
        <label htmlFor={fieldId} className="text-sm font-medium">
          {labelText}
          {requiredMark}
        </label>
        <select
          id={fieldId}
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={typeof value === "string" ? value : value === undefined ? "" : String(value)}
          onChange={(event) => !readOnly && handleAttrChange(field.key, event.target.value)}
          disabled={readOnly}
        >
          <option value="">{t("common.select")}</option>
          {selectOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const inputValue =
    field.type === "number"
      ? typeof value === "number"
        ? value
        : value === undefined || value === ""
          ? ""
          : Number.isNaN(Number(value))
            ? ""
            : Number(value)
      : typeof value === "string" || typeof value === "number"
        ? value
        : value === undefined
          ? ""
          : String(value);

  return (
      <div key={field.key} className={`space-y-1 ${field.fullWidth ? "supplier-span-2" : ""}`}>
        <label htmlFor={fieldId} className="text-sm font-medium">
          {labelText}
          {requiredMark}
        </label>
      <input
        id={fieldId}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        className="w-full border rounded-md px-3 py-2 text-sm"
        value={inputValue}
        onChange={(event) => {
          if (readOnly) return;
          if (field.type === "number") {
            const raw = event.target.value;
            handleAttrChange(field.key, raw === "" ? "" : Number(raw));
            return;
          }
          handleAttrChange(field.key, event.target.value);
        }}
        readOnly={readOnly}
        disabled={readOnly}
        placeholder={placeholderText}
      />
      {numericRule && !numericError && (
        <div className="text-xs text-muted">
          {t("validation.range", {
            min: numericRule.min,
            max: numericRule.max,
            unit: numericRule.unit ? ` ${numericRule.unit}` : "",
          })}
        </div>
      )}
      {numericError && <div className="text-xs text-red-600">{numericError}</div>}
    </div>
  );
}

function isValueFilled(field: FormField, value: string | number | boolean | undefined) {
  if (field.type === "boolean") {
    return value === true;
  }
  if (field.type === "number") {
    return typeof value === "number" && !Number.isNaN(value);
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "number") {
    return !Number.isNaN(value);
  }
  return false;
}

function isCertificationComplete(record: SupplierProductRecord, cert: string) {
  const key = cert.toLowerCase() as keyof SupplierProductRecord["certifications"];
  const data = record.certifications[key];
  if (!data) return false;
  return Boolean(data.fileName && data.certificateNumber && data.issuingBody && data.expiryDate);
}

function simpleHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
