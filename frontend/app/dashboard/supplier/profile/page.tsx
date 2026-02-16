"use client";

import { useEffect, useMemo, useState } from "react";
import { categories } from "../../../../data/categories";
import { CertificationType } from "../../../../data/compliancePartners";
import { fetchCompliancePartnersView } from "../../../../lib/compliancePartner/client";
import type { CompliancePartnerView } from "../../../../lib/compliancePartner/view";
import { getCertificationRequirements } from "../../../../data/certificationMatrix";
import {
  getSession,
  getSupplierCompanyProfile,
  upsertSupplierCompanyProfile,
  SupplierCompanyProfile,
  SupplierRepresentative,
  SupplierFactory,
} from "../../../../lib/store";
import { recordAudit } from "../../../../lib/audit";
import { useSupplierTranslations } from "../../../../lib/supplierI18n";

const SUPPLIER_TYPES = ["MANUFACTURER", "OEM", "ODM", "TRADING_COMPANY", "FACTORY_GROUP"] as const;
const MANUFACTURING_MODELS = ["OWN_FACTORY", "SUBCONTRACTED", "MIXED"] as const;
const YEARS_IN_OPERATION = ["UNKNOWN", "<1", "1-3", "3-5", "5-10", "10-20", ">20"] as const;
const EMPLOYEE_COUNTS = ["UNKNOWN", "1-10", "11-50", "51-200", "201-1000", ">1000"] as const;
const EXPORTER_OF_RECORD = ["SUPPLIER", "AGENT", "UNKNOWN"] as const;
const FREIGHT_MODES = ["SEA", "AIR", "HYBRID"] as const;
const QUALITY_SYSTEMS = ["ISO9001", "ISO14001", "ISO45001", "OTHER"] as const;
const CAPACITY_RANGES = ["UNKNOWN", "<10K", "10K-50K", "50K-200K", "200K-1M", ">1M"] as const;
const SETTLEMENT_METHODS = ["STRIPE_CONNECT", "WISE", "BANK_TRANSFER"] as const;

export default function SupplierCompanyProfilePage() {
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const { t } = useSupplierTranslations();
  const [profile, setProfile] = useState<SupplierCompanyProfile>(() => getSupplierCompanyProfile(supplierId));
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [submitMessage, setSubmitMessage] = useState<string>("");
  const [partners, setPartners] = useState<CompliancePartnerView[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [brisbaneOnly, setBrisbaneOnly] = useState(false);

  useEffect(() => {
    const next = getSupplierCompanyProfile(supplierId);
    if (session?.email && !next.contacts.primaryEmail) {
      next.contacts.primaryEmail = session.email;
    }
    setProfile(next);
  }, [supplierId, session?.email]);

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

  const locked = profile.governance.locked;

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.slug, label: t(`categories.${category.slug}`) })),
    [t]
  );
  const categoryLabelMap = useMemo(
    () => new Map(categories.map((category) => [category.slug, t(`categories.${category.slug}`)])),
    [t]
  );

  const selectedCompliancePartnerIds = profile.capability.preferredCompliancePartnerIds ?? [];
  const requiredCertifications = useMemo(() => {
    const certs = new Set<CertificationType>();
    profile.capability.intendedCategoryIds.forEach((categoryId) => {
      const req = getCertificationRequirements(categoryId);
      req.required.forEach((cert) => certs.add(cert));
    });
    return Array.from(certs);
  }, [profile.capability.intendedCategoryIds]);

  const partnerPool = useMemo(
    () => (brisbaneOnly ? partners.filter((partner) => partner.brisbaneOffice) : partners),
    [brisbaneOnly, partners]
  );

  const recommendedCompliancePartners = useMemo(() => {
    const candidates = requiredCertifications.length
      ? partnerPool.filter((partner) => requiredCertifications.every((cert) => partner.certifications.includes(cert)))
      : partnerPool;

    return candidates
      .map((partner) => {
        let score = 0;
        if (partner.status === "Available") score += 4;
        if (partner.status === "Limited") score += 2;
        score += Math.max(0, 12 - partner.slaDays);
        if (
          partner.focusCategories?.some((categoryId) => profile.capability.intendedCategoryIds.includes(categoryId))
        ) {
          score += 3;
        }
        return { partner, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ partner }) => partner);
  }, [requiredCertifications, profile.capability.intendedCategoryIds, partnerPool]);

  const updateProfile = (next: SupplierCompanyProfile) => {
    setProfile(next);
  };

  const toggleCompliancePartner = (partnerId: string, enabled: boolean) => {
    const nextIds = enabled
      ? Array.from(new Set([...selectedCompliancePartnerIds, partnerId]))
      : selectedCompliancePartnerIds.filter((id) => id !== partnerId);
    updateProfile({
      ...profile,
      capability: {
        ...profile.capability,
        preferredCompliancePartnerIds: nextIds,
      },
    });
  };

  const saveProfile = (section: string) => {
    const next = {
      ...profile,
      auditMeta: {
        ...profile.auditMeta,
        updatedAt: new Date().toISOString(),
        updatedByRole: "SUPPLIER" as const,
      },
    };
    upsertSupplierCompanyProfile(next);
    recordAudit("SUPPLIER_COMPANY_PROFILE_SAVED", { supplierId, section });
    setSaveMessage(t("companyProfile.save.success"));
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const requiredMissing = useMemo(() => {
    const missing: string[] = [];
    if (!profile.contacts.primaryEmail) missing.push(t("companyProfile.field.primaryEmail"));
    if (!profile.contacts.primaryMobile.countryCode || !profile.contacts.primaryMobile.number) {
      missing.push(t("companyProfile.field.primaryMobile"));
    }
    if (!profile.identity.legalNameNative) missing.push(t("companyProfile.field.legalNameNative"));
    if (!profile.identity.legalNameEnglish) missing.push(t("companyProfile.field.legalNameEnglish"));
    if (!profile.identity.legalStructure) missing.push(t("companyProfile.field.legalStructure"));
    if (!profile.identity.registrationNumber) missing.push(t("companyProfile.field.registrationNumber"));
    if (!profile.identity.registeredAddress.line1) missing.push(t("companyProfile.field.registeredAddressLine1"));
    if (!profile.identity.registeredAddress.city) missing.push(t("companyProfile.field.registeredAddressCity"));
    if (!profile.identity.registeredAddress.region) missing.push(t("companyProfile.field.registeredAddressRegion"));
    if (!profile.identity.registeredAddress.postalCode) missing.push(t("companyProfile.field.registeredAddressPostal"));
    if (!profile.representatives.authorisedRepresentatives.length) {
      missing.push(t("companyProfile.field.authorisedRepresentatives"));
    } else {
      profile.representatives.authorisedRepresentatives.forEach((rep, idx) => {
        if (!rep.fullName || !rep.title || !rep.email || !rep.mobile.countryCode || !rep.mobile.number || !rep.authorityDocumentId) {
          missing.push(t("companyProfile.field.authorisedRepresentative", { index: idx + 1 }));
        }
      });
    }
    if (!profile.capability.supplierType) missing.push(t("companyProfile.field.supplierType"));
    if (!profile.capability.manufacturingModel) missing.push(t("companyProfile.field.manufacturingModel"));
    if (!profile.capability.intendedCategoryIds.length) missing.push(t("companyProfile.field.intendedCategories"));
    if (!profile.commercial.acceptedZeroCommission) missing.push(t("companyProfile.field.acceptedZeroCommission"));
    if (!profile.commercial.acceptedServiceFeeStructure) missing.push(t("companyProfile.field.acceptedServiceFeeStructure"));
    if (!profile.logistics.insuranceAcknowledged) missing.push(t("companyProfile.field.insuranceAcknowledged"));
    if (!profile.logistics.proofOfDeliveryAcknowledged) missing.push(t("companyProfile.field.proofOfDeliveryAcknowledged"));
    if (!profile.payments.settlementMethod) missing.push(t("companyProfile.field.settlementMethod"));
    if (!profile.payments.settlementCurrency) missing.push(t("companyProfile.field.settlementCurrency"));
    if (!profile.payments.bankCountry) missing.push(t("companyProfile.field.bankCountry"));
    if (!profile.payments.beneficiaryLegalName) missing.push(t("companyProfile.field.beneficiaryLegalName"));
    if (!profile.payments.bankDetailsRefId) missing.push(t("companyProfile.field.bankDetailsRefId"));
    if (!profile.payments.bankVerificationDocumentId) missing.push(t("companyProfile.field.bankVerificationDocumentId"));
    if (
      !profile.declarations.supplierAgreementAccepted ||
      !profile.declarations.complianceTruthDeclared ||
      !profile.declarations.antiBriberyDeclared ||
      !profile.declarations.sanctionsDeclared ||
      !profile.declarations.productLiabilityDeclared ||
      !profile.declarations.auditConsentGranted ||
      !profile.declarations.privacyAccepted ||
      !profile.declarations.jurisdictionAccepted
    ) {
      missing.push(t("companyProfile.field.declarations"));
    }
    return missing;
  }, [profile, t]);

  const handleSubmit = () => {
    if (requiredMissing.length) {
      setSubmitMessage(t("companyProfile.submit.missing", { count: requiredMissing.length }));
      return;
    }
    const next: SupplierCompanyProfile = {
      ...profile,
      governance: {
        ...profile.governance,
        status: "SUBMITTED",
        locked: true,
        submittedAt: new Date().toISOString(),
        submittedByRepresentativeName: profile.representatives.authorisedRepresentatives[0]?.fullName || "",
      },
      auditMeta: {
        ...profile.auditMeta,
        updatedAt: new Date().toISOString(),
        updatedByRole: "SUPPLIER",
      },
    };
    upsertSupplierCompanyProfile(next);
    recordAudit("SUPPLIER_COMPANY_PROFILE_SUBMITTED", { supplierId });
    setProfile(next);
    setSubmitMessage(t("companyProfile.submit.success"));
  };

  const addRepresentative = () => {
    const nextRep: SupplierRepresentative = {
      fullName: "",
      title: "",
      nationality: "",
      email: "",
      mobile: { countryCode: "+86", number: "" },
      messagingApps: [],
      authorityDocumentId: "",
      authorityDeclarationAccepted: false,
    };
    updateProfile({
      ...profile,
      representatives: {
        authorisedRepresentatives: [...profile.representatives.authorisedRepresentatives, nextRep],
      },
    });
  };

  const updateRepresentative = (index: number, updates: Partial<SupplierRepresentative>) => {
    const next = profile.representatives.authorisedRepresentatives.map((rep, idx) =>
      idx === index ? { ...rep, ...updates } : rep
    );
    updateProfile({ ...profile, representatives: { authorisedRepresentatives: next } });
  };

  const removeRepresentative = (index: number) => {
    const next = profile.representatives.authorisedRepresentatives.filter((_, idx) => idx !== index);
    updateProfile({ ...profile, representatives: { authorisedRepresentatives: next } });
  };

  const addFactory = () => {
    const nextFactory: SupplierFactory = {
      name: "",
      country: "CN",
      city: "",
      address: "",
      ownershipType: "OWNED",
      capacityAnnualRange: "UNKNOWN",
      qualitySystemsDeclared: [],
      lastExternalAuditDate: "",
      auditReportDocumentId: "",
    };
    updateProfile({ ...profile, capability: { ...profile.capability, factories: [...profile.capability.factories, nextFactory] } });
  };

  const updateFactory = (index: number, updates: Partial<SupplierFactory>) => {
    const next = profile.capability.factories.map((fac, idx) => (idx === index ? { ...fac, ...updates } : fac));
    updateProfile({ ...profile, capability: { ...profile.capability, factories: next } });
  };

  const removeFactory = (index: number) => {
    const next = profile.capability.factories.filter((_, idx) => idx !== index);
    updateProfile({ ...profile, capability: { ...profile.capability, factories: next } });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("companyProfile.title")}</h1>
        <p className="text-sm text-muted">{t("companyProfile.subtitle")}</p>
        {locked && <p className="text-xs text-amber-700 mt-2">{t("companyProfile.lockedNote")}</p>}
      </div>

      <SectionCard title={t("companyProfile.section.contacts.title")} description={t("companyProfile.section.contacts.description")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label={t("companyProfile.field.primaryEmail")}
            value={profile.contacts.primaryEmail}
            disabled
            onChange={() => undefined}
          />
          <SelectField
            label={t("companyProfile.field.preferredLanguage")}
            value={profile.contacts.preferredLanguage}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, contacts: { ...profile.contacts, preferredLanguage: value as "en" | "zh-CN" } })}
            placeholder={t("common.select")}
            options={[
              { value: "en", label: t("language.en") },
              { value: "zh-CN", label: t("language.zh") },
            ]}
          />
          <TextField
            label={t("companyProfile.field.timeZone")}
            value={profile.contacts.timeZone}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, contacts: { ...profile.contacts, timeZone: value } })}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t("companyProfile.field.primaryMobileCountryCode")}
              value={profile.contacts.primaryMobile.countryCode}
              disabled={locked}
              onChange={(value) =>
                updateProfile({
                  ...profile,
                  contacts: {
                    ...profile.contacts,
                    primaryMobile: { ...profile.contacts.primaryMobile, countryCode: value },
                  },
                })
              }
            />
            <TextField
              label={t("companyProfile.field.primaryMobileNumber")}
              value={profile.contacts.primaryMobile.number}
              disabled={locked}
              onChange={(value) =>
                updateProfile({
                  ...profile,
                  contacts: {
                    ...profile.contacts,
                    primaryMobile: { ...profile.contacts.primaryMobile, number: value },
                  },
                })
              }
            />
          </div>
        </div>
        <SectionFooter
          onSave={() => saveProfile("contacts")}
          disabled={locked}
          message={saveMessage}
          label={t("companyProfile.action.saveSection")}
        />
      </SectionCard>

      <SectionCard title={t("companyProfile.section.identity.title")} description={t("companyProfile.section.identity.description")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label={t("companyProfile.field.legalNameNative")}
            value={profile.identity.legalNameNative}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, legalNameNative: value } })}
            required
          />
          <TextField
            label={t("companyProfile.field.legalNameEnglish")}
            value={profile.identity.legalNameEnglish}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, legalNameEnglish: value } })}
            required
          />
          <TextField
            label={t("companyProfile.field.tradingName")}
            value={profile.identity.tradingName || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, tradingName: value } })}
          />
          <TextField
            label={t("companyProfile.field.brandName")}
            value={profile.identity.brandName || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, brandName: value } })}
          />
          <SelectField
            label={t("companyProfile.field.countryOfIncorporation")}
            value={profile.identity.countryOfIncorporation}
            disabled
            onChange={() => undefined}
            placeholder={t("common.select")}
            options={[{ value: "CN", label: t("companyProfile.option.country.cn") }]}
          />
          <TextField
            label={t("companyProfile.field.legalStructure")}
            value={profile.identity.legalStructure}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, legalStructure: value } })}
            required
          />
          <TextField
            label={t("companyProfile.field.registrationNumber")}
            value={profile.identity.registrationNumber}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, registrationNumber: value } })}
            required
          />
          <TextField
            label={t("companyProfile.field.incorporationDate")}
            value={profile.identity.incorporationDate || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, incorporationDate: value } })}
            placeholder={t("common.dateFormat")}
          />
        </div>
        <AddressFields
          title={t("companyProfile.field.registeredAddress")}
          address={profile.identity.registeredAddress}
          disabled={locked}
          onChange={(next) => updateProfile({ ...profile, identity: { ...profile.identity, registeredAddress: next } })}
          t={t}
          prefix="registered"
        />
        <AddressFields
          title={t("companyProfile.field.operatingAddress")}
          address={profile.identity.operatingAddress || profile.identity.registeredAddress}
          disabled={locked}
          onChange={(next) => updateProfile({ ...profile, identity: { ...profile.identity, operatingAddress: next } })}
          t={t}
          prefix="operating"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label={t("companyProfile.field.websiteUrl")}
            value={profile.identity.websiteUrl || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, websiteUrl: value } })}
          />
          <TextField
            label={t("companyProfile.field.officialEmailDomain")}
            value={profile.identity.officialEmailDomain || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, officialEmailDomain: value } })}
          />
          <TextField
            label={t("companyProfile.field.logoAssetId")}
            value={profile.identity.logoAssetId || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, logoAssetId: value } })}
          />
          <SelectField
            label={t("companyProfile.field.yearsInOperationRange")}
            value={profile.identity.yearsInOperationRange || "UNKNOWN"}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, yearsInOperationRange: value } })}
            placeholder={t("common.select")}
            options={YEARS_IN_OPERATION.map((value) => ({ value, label: t(`companyProfile.option.years.${value}`) }))}
          />
          <SelectField
            label={t("companyProfile.field.employeeCountRange")}
            value={profile.identity.employeeCountRange || "UNKNOWN"}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, employeeCountRange: value } })}
            placeholder={t("common.select")}
            options={EMPLOYEE_COUNTS.map((value) => ({ value, label: t(`companyProfile.option.employees.${value}`) }))}
          />
        </div>
        <TextAreaField
          label={t("companyProfile.field.descriptionShort")}
          value={profile.identity.descriptionShort || ""}
          disabled={locked}
          onChange={(value) => updateProfile({ ...profile, identity: { ...profile.identity, descriptionShort: value } })}
        />
        <SectionFooter
          onSave={() => saveProfile("identity")}
          disabled={locked}
          message={saveMessage}
          label={t("companyProfile.action.saveSection")}
        />
      </SectionCard>

      <SectionCard title={t("companyProfile.section.representatives.title")} description={t("companyProfile.section.representatives.description")}>
        <div className="space-y-4">
          {profile.representatives.authorisedRepresentatives.map((rep, index) => (
            <div key={index} className="border rounded-xl p-4 space-y-3 bg-surface-muted">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t("companyProfile.representative.title", { index: index + 1 })}</h3>
                {!locked && (
                  <button className="text-xs text-red-600" onClick={() => removeRepresentative(index)}>
                    {t("companyProfile.representative.remove")}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label={t("companyProfile.field.repFullName")}
                  value={rep.fullName}
                  disabled={locked}
                  onChange={(value) => updateRepresentative(index, { fullName: value })}
                  required
                />
                <TextField
                  label={t("companyProfile.field.repTitle")}
                  value={rep.title}
                  disabled={locked}
                  onChange={(value) => updateRepresentative(index, { title: value })}
                  required
                />
                <TextField
                  label={t("companyProfile.field.repNationality")}
                  value={rep.nationality || ""}
                  disabled={locked}
                  onChange={(value) => updateRepresentative(index, { nationality: value })}
                />
                <TextField
                  label={t("companyProfile.field.repEmail")}
                  value={rep.email}
                  disabled={locked}
                  onChange={(value) => updateRepresentative(index, { email: value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label={t("companyProfile.field.repMobileCountryCode")}
                    value={rep.mobile.countryCode}
                    disabled={locked}
                    onChange={(value) => updateRepresentative(index, { mobile: { ...rep.mobile, countryCode: value } })}
                  />
                  <TextField
                    label={t("companyProfile.field.repMobileNumber")}
                    value={rep.mobile.number}
                    disabled={locked}
                    onChange={(value) => updateRepresentative(index, { mobile: { ...rep.mobile, number: value } })}
                  />
                </div>
                <TextField
                  label={t("companyProfile.field.repAuthorityDocumentId")}
                  value={rep.authorityDocumentId || ""}
                  disabled={locked}
                  onChange={(value) => updateRepresentative(index, { authorityDocumentId: value })}
                />
                <SelectField
                  label={t("companyProfile.field.repMessagingApps")}
                  value={(rep.messagingApps || [])[0] || ""}
                  disabled={locked}
                  onChange={(value) => updateRepresentative(index, { messagingApps: value ? [value] : [] })}
                  placeholder={t("common.select")}
                  options={[
                    { value: "", label: t("common.select") },
                    { value: "WECHAT", label: t("companyProfile.option.messaging.wechat") },
                    { value: "WHATSAPP", label: t("companyProfile.option.messaging.whatsapp") },
                    { value: "SIGNAL", label: t("companyProfile.option.messaging.signal") },
                    { value: "TELEGRAM", label: t("companyProfile.option.messaging.telegram") },
                    { value: "NONE", label: t("companyProfile.option.messaging.none") },
                  ]}
                />
              </div>
              <CheckboxField
                label={t("companyProfile.field.repAuthorityAccepted")}
                checked={rep.authorityDeclarationAccepted || false}
                disabled={locked}
                onChange={(value) =>
                  updateRepresentative(index, {
                    authorityDeclarationAccepted: value,
                    authorityDeclaredAt: value ? new Date().toISOString() : rep.authorityDeclaredAt,
                  })
                }
              />
            </div>
          ))}
        </div>
        {!locked && (
          <button className="mt-3 px-3 py-2 text-sm bg-brand-100 text-brand-700 rounded-md" onClick={addRepresentative}>
            {t("companyProfile.representative.add")}
          </button>
        )}
        <SectionFooter
          onSave={() => saveProfile("representatives")}
          disabled={locked}
          message={saveMessage}
          label={t("companyProfile.action.saveSection")}
        />
      </SectionCard>

      <SectionCard title={t("companyProfile.section.capability.title")} description={t("companyProfile.section.capability.description")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label={t("companyProfile.field.supplierType")}
            value={profile.capability.supplierType || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, capability: { ...profile.capability, supplierType: value as any } })}
            placeholder={t("common.select")}
            options={SUPPLIER_TYPES.map((value) => ({ value, label: t(`companyProfile.option.supplierType.${value}`) }))}
          />
          <SelectField
            label={t("companyProfile.field.manufacturingModel")}
            value={profile.capability.manufacturingModel || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, capability: { ...profile.capability, manufacturingModel: value as any } })}
            placeholder={t("common.select")}
            options={MANUFACTURING_MODELS.map((value) => ({ value, label: t(`companyProfile.option.manufacturingModel.${value}`) }))}
          />
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold">{t("companyProfile.field.factories")}</div>
          {profile.capability.factories.map((factory, index) => (
            <div key={index} className="border rounded-xl p-4 space-y-3 bg-surface-muted">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{t("companyProfile.factory.title", { index: index + 1 })}</h4>
                {!locked && (
                  <button className="text-xs text-red-600" onClick={() => removeFactory(index)}>
                    {t("companyProfile.factory.remove")}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label={t("companyProfile.field.factoryName")}
                  value={factory.name || ""}
                  disabled={locked}
                  onChange={(value) => updateFactory(index, { name: value })}
                />
                <TextField
                  label={t("companyProfile.field.factoryCity")}
                  value={factory.city || ""}
                  disabled={locked}
                  onChange={(value) => updateFactory(index, { city: value })}
                />
                <TextField
                  label={t("companyProfile.field.factoryAddress")}
                  value={factory.address || ""}
                  disabled={locked}
                  onChange={(value) => updateFactory(index, { address: value })}
                />
                <SelectField
                  label={t("companyProfile.field.factoryOwnership")}
                  value={factory.ownershipType || ""}
                  disabled={locked}
                  onChange={(value) => updateFactory(index, { ownershipType: value as any })}
                  placeholder={t("common.select")}
                  options={[
                    { value: "OWNED", label: t("companyProfile.option.factoryOwnership.OWNED") },
                    { value: "LEASED", label: t("companyProfile.option.factoryOwnership.LEASED") },
                    { value: "THIRD_PARTY", label: t("companyProfile.option.factoryOwnership.THIRD_PARTY") },
                  ]}
                />
                <SelectField
                  label={t("companyProfile.field.factoryCapacity")}
                  value={factory.capacityAnnualRange || "UNKNOWN"}
                  disabled={locked}
                  onChange={(value) => updateFactory(index, { capacityAnnualRange: value })}
                  placeholder={t("common.select")}
                  options={CAPACITY_RANGES.map((value) => ({ value, label: t(`companyProfile.option.capacity.${value}`) }))}
                />
                <TextField
                  label={t("companyProfile.field.factoryAuditReport")}
                  value={factory.auditReportDocumentId || ""}
                  disabled={locked}
                  onChange={(value) => updateFactory(index, { auditReportDocumentId: value })}
                />
                <TextField
                  label={t("companyProfile.field.factoryLastAudit")}
                  value={factory.lastExternalAuditDate || ""}
                  disabled={locked}
                  onChange={(value) => updateFactory(index, { lastExternalAuditDate: value })}
                  placeholder={t("common.dateFormat")}
                />
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("companyProfile.field.factoryQualitySystems")}</div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {QUALITY_SYSTEMS.map((system) => (
                      <label key={system} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={locked}
                          checked={(factory.qualitySystemsDeclared || []).includes(system)}
                          onChange={(event) => {
                            const next = new Set(factory.qualitySystemsDeclared || []);
                            if (event.target.checked) next.add(system);
                            else next.delete(system);
                            updateFactory(index, { qualitySystemsDeclared: Array.from(next) });
                          }}
                        />
                        {t(`companyProfile.option.qualitySystem.${system}`)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!locked && (
            <button className="px-3 py-2 text-sm bg-brand-100 text-brand-700 rounded-md" onClick={addFactory}>
              {t("companyProfile.factory.add")}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">{t("companyProfile.field.intendedCategories")}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {categoryOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={profile.capability.intendedCategoryIds.includes(option.value)}
                  onChange={(event) => {
                    const next = new Set(profile.capability.intendedCategoryIds);
                    if (event.target.checked) next.add(option.value);
                    else next.delete(option.value);
                    updateProfile({
                      ...profile,
                      capability: { ...profile.capability, intendedCategoryIds: Array.from(next) },
                    });
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CheckboxField
            label={t("companyProfile.field.oemOdmConfirmed")}
            checked={profile.capability.oemOdmConfirmed}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, capability: { ...profile.capability, oemOdmConfirmed: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.privateLabelSupported")}
            checked={profile.capability.privateLabelSupported}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, capability: { ...profile.capability, privateLabelSupported: value } })}
          />
        </div>
        <SectionFooter
          onSave={() => saveProfile("capability")}
          disabled={locked}
          message={saveMessage}
          label={t("companyProfile.action.saveSection")}
        />
      </SectionCard>

      <SectionCard
        title={t("companyProfile.section.complianceAgents.title")}
        description={t("companyProfile.section.complianceAgents.description")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold">{t("companyProfile.field.complianceAgentsLabel")}</div>
              <div className="text-xs text-muted mt-1">{t("companyProfile.field.complianceAgentsHint")}</div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={brisbaneOnly}
                onChange={(event) => setBrisbaneOnly(event.target.checked)}
              />
              {t("companyProfile.field.complianceAgentsBrisbaneOnly")}
            </label>
            <div className="space-y-2 text-sm">
              {partnersLoading && <div className="text-xs text-muted">{t("common.loading")}</div>}
              {!partnersLoading && partnerPool.length === 0 && (
                <div className="text-xs text-muted">{t("companyProfile.field.complianceAgentsNone")}</div>
              )}
              {partnerPool.map((partner) => (
                <label key={partner.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={selectedCompliancePartnerIds.includes(partner.id)}
                    onChange={(event) => toggleCompliancePartner(partner.id, event.target.checked)}
                  />
                  <div>
                    <div className="font-medium">
                      {partner.name}
                      {partner.brisbaneOffice && (
                        <span className="ml-2 text-[10px] uppercase text-emerald-700">
                          {t("common.brisbaneOffice")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {t("companyProfile.field.complianceAgentsMeta", {
                        sla: partner.slaDays,
                        location: partner.location,
                        certs: partner.certifications.join(", "),
                      })}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-semibold">{t("companyProfile.field.complianceAgentsRecommended")}</div>
            <div className="text-xs text-muted">
              {t("companyProfile.field.complianceAgentsRequiredCerts", {
                certs: requiredCertifications.length ? requiredCertifications.join(", ") : t("common.none"),
              })}
            </div>
            {recommendedCompliancePartners.length === 0 ? (
              <div className="text-xs text-muted">{t("companyProfile.field.complianceAgentsNone")}</div>
            ) : (
              <div className="space-y-2">
                {recommendedCompliancePartners.map((partner) => {
                  const focusCategory = partner.focusCategories?.find((id) =>
                    profile.capability.intendedCategoryIds.includes(id)
                  );
                  const focusLabel = focusCategory ? categoryLabelMap.get(focusCategory) || focusCategory : "";
                  const focusText = focusLabel
                    ? t("companyProfile.field.complianceAgentsFocus", { category: focusLabel })
                    : t("companyProfile.field.complianceAgentsFocusGeneral");
                  return (
                    <div key={partner.id} className="border rounded-md p-3 bg-white text-xs">
                      <div className="font-semibold text-sm">{partner.name}</div>
                      <div className="text-muted">
                        {focusText} · {t("companyProfile.field.complianceAgentsSla", { sla: partner.slaDays })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <SectionFooter
          onSave={() => saveProfile("complianceAgents")}
          disabled={locked}
          message={saveMessage}
          label={t("companyProfile.action.saveSection")}
        />
      </SectionCard>

      <SectionCard title={t("companyProfile.section.commercial.title")} description={t("companyProfile.section.commercial.description")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CheckboxField
            label={t("companyProfile.field.acceptedZeroCommission")}
            checked={profile.commercial.acceptedZeroCommission}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, commercial: { ...profile.commercial, acceptedZeroCommission: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.acceptedServiceFeeStructure")}
            checked={profile.commercial.acceptedServiceFeeStructure}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, commercial: { ...profile.commercial, acceptedServiceFeeStructure: value } })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label={t("companyProfile.field.defaultMoq")}
            value={profile.commercial.defaultMoq?.toString() || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, commercial: { ...profile.commercial, defaultMoq: Number(value) || undefined } })}
          />
          <TextField
            label={t("companyProfile.field.productionLeadTimeDays")}
            value={profile.commercial.productionLeadTimeDays?.toString() || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, commercial: { ...profile.commercial, productionLeadTimeDays: Number(value) || undefined } })}
          />
          <TextField
            label={t("companyProfile.field.dispatchLeadTimeDays")}
            value={profile.commercial.dispatchReadyLeadTimeDays?.toString() || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, commercial: { ...profile.commercial, dispatchReadyLeadTimeDays: Number(value) || undefined } })}
          />
          <TextField
            label={t("companyProfile.field.supportedCurrencies")}
            value={profile.commercial.supportedCurrencies.join(" / ")}
            disabled
            onChange={() => undefined}
          />
        </div>
        <SectionFooter
          onSave={() => saveProfile("commercial")}
          disabled={locked}
          message={saveMessage}
          label={t("companyProfile.action.saveSection")}
        />
      </SectionCard>

      <SectionCard title={t("companyProfile.section.logistics.title")} description={t("companyProfile.section.logistics.description")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label={t("companyProfile.field.incotermsSupported")}
            value={profile.logistics.incotermsSupported.join(" / ")}
            disabled
            onChange={() => undefined}
          />
          <SelectField
            label={t("companyProfile.field.exporterOfRecord")}
            value={profile.logistics.exporterOfRecord || "UNKNOWN"}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, logistics: { ...profile.logistics, exporterOfRecord: value as any } })}
            placeholder={t("common.select")}
            options={EXPORTER_OF_RECORD.map((value) => ({ value, label: t(`companyProfile.option.exporter.${value}`) }))}
          />
          <TextField
            label={t("companyProfile.field.portOfDeparture")}
            value={profile.logistics.portOfDeparture || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, logistics: { ...profile.logistics, portOfDeparture: value } })}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {FREIGHT_MODES.map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={locked}
                checked={profile.logistics.preferredFreightModes.includes(mode)}
                onChange={(event) => {
                  const next = new Set(profile.logistics.preferredFreightModes);
                  if (event.target.checked) next.add(mode);
                  else next.delete(mode);
                  updateProfile({ ...profile, logistics: { ...profile.logistics, preferredFreightModes: Array.from(next) as any } });
                }}
              />
              {t(`companyProfile.option.freight.${mode}`)}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CheckboxField
            label={t("companyProfile.field.dangerousGoodsDeclared")}
            checked={profile.logistics.dangerousGoodsDeclared}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, logistics: { ...profile.logistics, dangerousGoodsDeclared: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.batteryHandlingAcknowledged")}
            checked={profile.logistics.batteryHandlingAcknowledged}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, logistics: { ...profile.logistics, batteryHandlingAcknowledged: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.insuranceAcknowledged")}
            checked={profile.logistics.insuranceAcknowledged}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, logistics: { ...profile.logistics, insuranceAcknowledged: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.proofOfDeliveryAcknowledged")}
            checked={profile.logistics.proofOfDeliveryAcknowledged}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, logistics: { ...profile.logistics, proofOfDeliveryAcknowledged: value } })}
          />
        </div>
        <SectionFooter
          onSave={() => saveProfile("logistics")}
          disabled={locked}
          message={saveMessage}
          label={t("companyProfile.action.saveSection")}
        />
      </SectionCard>

      <SectionCard title={t("companyProfile.section.payments.title")} description={t("companyProfile.section.payments.description")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label={t("companyProfile.field.settlementMethod")}
            value={profile.payments.settlementMethod || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, payments: { ...profile.payments, settlementMethod: value as any } })}
            placeholder={t("common.select")}
            options={SETTLEMENT_METHODS.map((value) => ({ value, label: t(`companyProfile.option.settlement.${value}`) }))}
          />
          <SelectField
            label={t("companyProfile.field.settlementCurrency")}
            value={profile.payments.settlementCurrency || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, payments: { ...profile.payments, settlementCurrency: value as any } })}
            placeholder={t("common.select")}
            options={[
              { value: "CNY", label: t("companyProfile.option.currency.CNY") },
              { value: "AUD", label: t("companyProfile.option.currency.AUD") },
            ]}
          />
          <SelectField
            label={t("companyProfile.field.bankCountry")}
            value={profile.payments.bankCountry || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, payments: { ...profile.payments, bankCountry: value as any } })}
            placeholder={t("common.select")}
            options={[
              { value: "CN", label: t("companyProfile.option.country.cn") },
              { value: "AU", label: t("companyProfile.option.country.au") },
            ]}
          />
          <TextField
            label={t("companyProfile.field.beneficiaryLegalName")}
            value={profile.payments.beneficiaryLegalName || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, payments: { ...profile.payments, beneficiaryLegalName: value } })}
          />
          <TextField
            label={t("companyProfile.field.bankDetailsRefId")}
            value={profile.payments.bankDetailsRefId || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, payments: { ...profile.payments, bankDetailsRefId: value } })}
          />
          <TextField
            label={t("companyProfile.field.bankVerificationDocumentId")}
            value={profile.payments.bankVerificationDocumentId || ""}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, payments: { ...profile.payments, bankVerificationDocumentId: value } })}
          />
          <TextField
            label={t("companyProfile.field.bankVerified")}
            value={profile.payments.bankVerified ? t("common.complete") : t("common.pending")}
            disabled
            onChange={() => undefined}
          />
        </div>
        <SectionFooter
          onSave={() => saveProfile("payments")}
          disabled={locked}
          message={saveMessage}
          label={t("companyProfile.action.saveSection")}
        />
      </SectionCard>

      <SectionCard title={t("companyProfile.section.declarations.title")} description={t("companyProfile.section.declarations.description")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CheckboxField
            label={t("companyProfile.field.declarationSupplierAgreement")}
            checked={profile.declarations.supplierAgreementAccepted}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, declarations: { ...profile.declarations, supplierAgreementAccepted: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.declarationComplianceTruth")}
            checked={profile.declarations.complianceTruthDeclared}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, declarations: { ...profile.declarations, complianceTruthDeclared: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.declarationAntiBribery")}
            checked={profile.declarations.antiBriberyDeclared}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, declarations: { ...profile.declarations, antiBriberyDeclared: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.declarationSanctions")}
            checked={profile.declarations.sanctionsDeclared}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, declarations: { ...profile.declarations, sanctionsDeclared: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.declarationProductLiability")}
            checked={profile.declarations.productLiabilityDeclared}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, declarations: { ...profile.declarations, productLiabilityDeclared: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.declarationAuditConsent")}
            checked={profile.declarations.auditConsentGranted}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, declarations: { ...profile.declarations, auditConsentGranted: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.declarationPrivacy")}
            checked={profile.declarations.privacyAccepted}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, declarations: { ...profile.declarations, privacyAccepted: value } })}
          />
          <CheckboxField
            label={t("companyProfile.field.declarationJurisdiction")}
            checked={profile.declarations.jurisdictionAccepted}
            disabled={locked}
            onChange={(value) => updateProfile({ ...profile, declarations: { ...profile.declarations, jurisdictionAccepted: value } })}
          />
        </div>
        <SectionFooter
          onSave={() => saveProfile("declarations")}
          disabled={locked}
          message={saveMessage}
          label={t("companyProfile.action.saveSection")}
        />
      </SectionCard>

      <SectionCard title={t("companyProfile.section.submit.title")} description={t("companyProfile.section.submit.description")}>
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge label={t("companyProfile.status.label")} value={t(`companyProfile.status.${profile.governance.status}`)} />
          {profile.governance.submittedAt && (
            <span className="text-xs text-muted">{t("companyProfile.status.submittedAt", { date: profile.governance.submittedAt })}</span>
          )}
        </div>
        {requiredMissing.length > 0 && (
          <div className="text-xs text-amber-700">
            {t("companyProfile.submit.blocked", { count: requiredMissing.length })}
          </div>
        )}
        {submitMessage && <div className="text-xs text-brand-700">{submitMessage}</div>}
        <div className="flex gap-3">
          <button
            className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold disabled:opacity-50"
            onClick={handleSubmit}
            disabled={locked}
          >
            {t("companyProfile.submit.button")}
          </button>
        </div>
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

function SectionFooter({
  onSave,
  disabled,
  message,
  label,
}: {
  onSave: () => void;
  disabled?: boolean;
  message?: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-muted">
      <div>{message}</div>
      <button
        className="px-3 py-2 bg-brand-100 text-brand-700 rounded-md text-sm font-semibold disabled:opacity-50"
        onClick={onSave}
        disabled={disabled}
      >
        {label}
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        className="w-full border rounded-md px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <textarea
        className="w-full border rounded-md px-3 py-2 text-sm min-h-[90px]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <select
        className="w-full border rounded-md px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder ?? ""}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
      <span>{label}</span>
    </label>
  );
}

function AddressFields({
  title,
  address,
  disabled,
  onChange,
  t,
  prefix,
}: {
  title: string;
  address: { line1: string; line2?: string; city: string; region: string; postalCode: string; country: "CN" | "AU" };
  disabled?: boolean;
  onChange: (next: typeof address) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  prefix: "registered" | "operating";
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label={t(`companyProfile.field.${prefix}AddressLine1`)}
          value={address.line1}
          disabled={disabled}
          onChange={(value) => onChange({ ...address, line1: value })}
        />
        <TextField
          label={t(`companyProfile.field.${prefix}AddressLine2`)}
          value={address.line2 || ""}
          disabled={disabled}
          onChange={(value) => onChange({ ...address, line2: value })}
        />
        <TextField
          label={t(`companyProfile.field.${prefix}AddressCity`)}
          value={address.city}
          disabled={disabled}
          onChange={(value) => onChange({ ...address, city: value })}
        />
        <TextField
          label={t(`companyProfile.field.${prefix}AddressRegion`)}
          value={address.region}
          disabled={disabled}
          onChange={(value) => onChange({ ...address, region: value })}
        />
        <TextField
          label={t(`companyProfile.field.${prefix}AddressPostal`)}
          value={address.postalCode}
          disabled={disabled}
          onChange={(value) => onChange({ ...address, postalCode: value })}
        />
        <SelectField
          label={t(`companyProfile.field.${prefix}AddressCountry`)}
          value={address.country}
          disabled
          onChange={() => undefined}
          placeholder={t("common.select")}
          options={[
            { value: "CN", label: t("companyProfile.option.country.cn") },
            { value: "AU", label: t("companyProfile.option.country.au") },
          ]}
        />
      </div>
    </div>
  );
}

function StatusBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs bg-surface-muted px-3 py-1 rounded-full">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
