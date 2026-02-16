"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import en from "../locales/en/supplier.json";
import zh from "../locales/zh-CN/supplier.json";
import { getSession, getSupplierProfiles, upsertSupplierProfile } from "./store";

export type SupplierLocale = "en" | "zh-CN";

const dictionaries: Record<SupplierLocale, Record<string, string>> = {
  en: en as Record<string, string>,
  "zh-CN": zh as Record<string, string>,
};

const enKeys = Object.keys(dictionaries.en);
const zhKeys = Object.keys(dictionaries["zh-CN"]);
const missingZh = enKeys.filter((key) => !zhKeys.includes(key));
const missingEn = zhKeys.filter((key) => !enKeys.includes(key));
if (missingZh.length || missingEn.length) {
  const message = `Supplier i18n keys mismatch. Missing zh-CN: ${missingZh.length}, missing en: ${missingEn.length}`;
  throw new Error(message);
}

interface SupplierI18nContextValue {
  locale: SupplierLocale;
  setLocale: (next: SupplierLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const SupplierI18nContext = createContext<SupplierI18nContextValue>({
  locale: "en",
  setLocale: () => undefined,
  t: (key: string) => key,
});

function translate(
  dict: Record<string, string>,
  key: string,
  vars?: Record<string, string | number>
) {
  let template = dict[key] ?? key;
  if (!vars) return template;
  Object.entries(vars).forEach(([name, value]) => {
    template = template.replace(new RegExp(`{${name}}`, "g"), String(value));
  });
  return template;
}

export function SupplierI18nProvider({ children }: { children: ReactNode }) {
  const session = getSession();
  const supplierId = session?.userId || "supplier-user";
  const [locale, setLocaleState] = useState<SupplierLocale>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const profiles = getSupplierProfiles();
    const profile = profiles.find((p) => p.supplierId === supplierId);
    const stored = window.localStorage.getItem(`rre-v1:supplier-lang:${supplierId}`) as SupplierLocale | null;
    const next = (profile?.preferredLanguage as SupplierLocale) || stored || "en";
    setLocaleState(next);
  }, [supplierId]);

  const setLocale = (next: SupplierLocale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`rre-v1:supplier-lang:${supplierId}`, next);
    }
    const profiles = getSupplierProfiles();
    const profile = profiles.find((p) => p.supplierId === supplierId);
    if (profile) {
      upsertSupplierProfile({ ...profile, preferredLanguage: next, updatedAt: new Date().toISOString() });
    }
  };

  const t = useMemo(
    () => (key: string, vars?: Record<string, string | number>) =>
      translate(dictionaries[locale], key, vars),
    [locale]
  );

  return (
    <SupplierI18nContext.Provider value={{ locale, setLocale, t }}>{children}</SupplierI18nContext.Provider>
  );
}

export function useSupplierTranslations() {
  return useContext(SupplierI18nContext);
}
