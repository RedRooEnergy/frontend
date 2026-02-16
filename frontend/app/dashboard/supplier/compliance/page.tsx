"use client";

import { useEffect, useMemo, useState } from "react";
import { categories } from "../../../../data/categories";
import {
  getSession,
  getSupplierCompanyProfile,
  getSupplierComplianceProfile,
  upsertSupplierComplianceProfile,
  SupplierCategoryCompliance,
  SupplierComplianceProfile,
  SupplierCertificationRecord,
} from "../../../../lib/store";
import { recordAudit } from "../../../../lib/audit";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

const CERT_TYPES = ["CEC", "RCM", "EESS", "GEMS", "IEC", "ISO", "UN38_3"] as const;

export default function SupplierComplianceProfilePage() {
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const { t } = useSupplierTranslations();
  const [profile, setProfile] = useState<SupplierComplianceProfile>(() => getSupplierComplianceProfile(supplierId));
  const [message, setMessage] = useState("");
  const [newCert, setNewCert] = useState<SupplierCertificationRecord>({
    id: "",
    type: "CEC",
    holderLegalName: "",
    certificateNumber: "",
    issuingAuthority: "",
    issueDate: "",
    expiryDate: "",
    scopeModels: [],
    certificateDocumentId: "",
    translationDocumentId: "",
    verificationStatus: "PENDING",
  });

  useEffect(() => {
    setProfile(getSupplierComplianceProfile(supplierId));
  }, [supplierId]);

  const companyProfile = useMemo(() => getSupplierCompanyProfile(supplierId), [supplierId]);

  useEffect(() => {
    const categoryIds = companyProfile.capability.intendedCategoryIds;
    if (!categoryIds.length) return;
    if (categoryIds.join("|") === profile.categoryIds.join("|")) return;
    const existingMap = new Map(
      profile.categoryCompliance.map((entry) => [entry.categoryId, entry])
    );

    const nextCompliance: SupplierCategoryCompliance[] = categoryIds.map(
      (categoryId): SupplierCategoryCompliance => {
        const existing = existingMap.get(categoryId);
        if (existing) return existing;

        return {
          categoryId,
          batteryComplianceRequired: false,
          electricalSafetyRequired: false,
          energyEfficiencyRequired: false,
          categoryStatus: "NOT_READY" as const,
        };
      }
    );
    const next: SupplierComplianceProfile = {
      ...profile,
      categoryIds,
      categoryCompliance: nextCompliance,
      auditMeta: { ...profile.auditMeta, updatedAt: new Date().toISOString(), updatedByRole: "SUPPLIER" },
    };
    upsertSupplierComplianceProfile(next);
    setProfile(next);
  }, [companyProfile.capability.intendedCategoryIds, profile, supplierId]);

  const categoryLabels = useMemo(() => {
    const map = new Map(categories.map((category) => [category.slug, t(`categories.${category.slug}`)]));
    return profile.categoryIds.map((categoryId) => ({
      id: categoryId,
      label: map.get(categoryId) || categoryId,
    }));
  }, [profile.categoryIds, t]);

  const addCertification = () => {
    if (!newCert.holderLegalName || !newCert.certificateNumber || !newCert.issuingAuthority) {
      setMessage(t("complianceProfile.add.error"));
      return;
    }
    const record: SupplierCertificationRecord = {
      ...newCert,
      id: crypto.randomUUID(),
      verificationStatus: "PENDING",
      scopeModels: newCert.scopeModels.filter(Boolean),
    };
    const next: SupplierComplianceProfile = {
      ...profile,
      certifications: [record, ...profile.certifications],
      auditMeta: { ...profile.auditMeta, updatedAt: new Date().toISOString(), updatedByRole: "SUPPLIER" },
    };
    upsertSupplierComplianceProfile(next);
    recordAudit("SUPPLIER_COMPLIANCE_CERT_ADDED", { supplierId, certType: record.type });
    setProfile(next);
    setNewCert({
      id: "",
      type: "CEC",
      holderLegalName: "",
      certificateNumber: "",
      issuingAuthority: "",
      issueDate: "",
      expiryDate: "",
      scopeModels: [],
      certificateDocumentId: "",
      translationDocumentId: "",
      verificationStatus: "PENDING",
    });
    setMessage(t("complianceProfile.add.success"));
  };

  const deleteCertification = (id: string) => {
    const next: SupplierComplianceProfile = {
      ...profile,
      certifications: profile.certifications.filter((cert) => cert.id !== id),
      auditMeta: { ...profile.auditMeta, updatedAt: new Date().toISOString(), updatedByRole: "SUPPLIER" },
    };
    upsertSupplierComplianceProfile(next);
    setProfile(next);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("complianceProfile.title")}</h1>
        <p className="text-sm text-muted">{t("complianceProfile.subtitle")}</p>
      </div>

      <SectionCard title={t("complianceProfile.section.scope.title")} description={t("complianceProfile.section.scope.description")}>
        {categoryLabels.length === 0 ? (
          <div className="text-sm text-muted">{t("complianceProfile.scope.empty")}</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categoryLabels.map((category) => (
              <span key={category.id} className="px-3 py-1 rounded-full bg-surface-muted text-xs font-semibold">
                {category.label}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted">{t("complianceProfile.scope.note")}</p>
      </SectionCard>

      <SectionCard title={t("complianceProfile.section.certifications.title")} description={t("complianceProfile.section.certifications.description")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label={t("complianceProfile.field.certType")}
            value={newCert.type}
            onChange={(value) => setNewCert({ ...newCert, type: value as SupplierCertificationRecord["type"] })}
            options={CERT_TYPES.map((value) => ({ value, label: value }))}
          />
          <TextField
            label={t("complianceProfile.field.holderLegalName")}
            value={newCert.holderLegalName}
            onChange={(value) => setNewCert({ ...newCert, holderLegalName: value })}
          />
          <TextField
            label={t("complianceProfile.field.certificateNumber")}
            value={newCert.certificateNumber}
            onChange={(value) => setNewCert({ ...newCert, certificateNumber: value })}
          />
          <TextField
            label={t("complianceProfile.field.issuingAuthority")}
            value={newCert.issuingAuthority}
            onChange={(value) => setNewCert({ ...newCert, issuingAuthority: value })}
          />
          <TextField
            label={t("complianceProfile.field.issueDate")}
            value={newCert.issueDate}
            onChange={(value) => setNewCert({ ...newCert, issueDate: value })}
            placeholder={t("common.dateFormat")}
          />
          <TextField
            label={t("complianceProfile.field.expiryDate")}
            value={newCert.expiryDate}
            onChange={(value) => setNewCert({ ...newCert, expiryDate: value })}
            placeholder={t("common.dateFormat")}
          />
          <TextField
            label={t("complianceProfile.field.scopeModels")}
            value={newCert.scopeModels.join(", ")}
            onChange={(value) => setNewCert({ ...newCert, scopeModels: value.split(",").map((item) => item.trim()) })}
          />
          <TextField
            label={t("complianceProfile.field.certificateDocumentId")}
            value={newCert.certificateDocumentId}
            onChange={(value) => setNewCert({ ...newCert, certificateDocumentId: value })}
          />
          <TextField
            label={t("complianceProfile.field.translationDocumentId")}
            value={newCert.translationDocumentId || ""}
            onChange={(value) => setNewCert({ ...newCert, translationDocumentId: value })}
          />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold" onClick={addCertification}>
            {t("complianceProfile.add.button")}
          </button>
          {message && <span className="text-brand-700">{message}</span>}
        </div>

        <div className="space-y-3">
          {profile.certifications.length === 0 ? (
            <div className="text-sm text-muted">{t("complianceProfile.certifications.empty")}</div>
          ) : (
            profile.certifications.map((cert) => (
              <div key={cert.id} className="border rounded-xl p-4 bg-surface-muted space-y-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-sm text-muted">{t("complianceProfile.certifications.type")}</div>
                    <div className="text-base font-semibold">{cert.type}</div>
                  </div>
                  <div className="text-xs text-muted">
                    {t("complianceProfile.certifications.status", {
                      status: t(`complianceProfile.verificationStatus.${cert.verificationStatus}`),
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <InfoField label={t("complianceProfile.field.holderLegalName")} value={cert.holderLegalName} />
                  <InfoField label={t("complianceProfile.field.certificateNumber")} value={cert.certificateNumber} />
                  <InfoField label={t("complianceProfile.field.issuingAuthority")} value={cert.issuingAuthority} />
                  <InfoField label={t("complianceProfile.field.issueDate")} value={cert.issueDate} />
                  <InfoField label={t("complianceProfile.field.expiryDate")} value={cert.expiryDate} />
                  <InfoField label={t("complianceProfile.field.scopeModels")} value={cert.scopeModels.join(", ") || t("common.none")} />
                  <InfoField label={t("complianceProfile.field.certificateDocumentId")} value={cert.certificateDocumentId} />
                  <InfoField label={t("complianceProfile.field.translationDocumentId")} value={cert.translationDocumentId || t("common.none")} />
                </div>
                <div className="flex justify-end">
                  <button className="text-xs text-red-600" onClick={() => deleteCertification(cert.id)}>
                    {t("complianceProfile.certifications.remove")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard title={t("complianceProfile.section.categoryStatus.title")} description={t("complianceProfile.section.categoryStatus.description")}>
        {profile.categoryCompliance.length === 0 ? (
          <div className="text-sm text-muted">{t("complianceProfile.categoryStatus.empty")}</div>
        ) : (
          <div className="space-y-2">
            {profile.categoryCompliance.map((entry) => (
              <div key={entry.categoryId} className="flex items-center justify-between border rounded-xl p-3 bg-surface-muted">
                <div>
                  <div className="text-sm text-muted">{t("complianceProfile.categoryStatus.category")}</div>
                  <div className="font-semibold">{t(`categories.${entry.categoryId}`)}</div>
                </div>
                <div className="text-xs font-semibold">{t(`complianceProfile.categoryStatus.${entry.categoryStatus}`)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface rounded-2xl shadow-card border p-5 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        className="w-full border rounded-md px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <select className="w-full border rounded-md px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
