export type Language = "en" | "zh";

export const defaultLanguage: Language = "en";
export const STORAGE_KEY = "rre-lang";

export const translations: Record<Language, Record<string, string>> = {
  en: {},
  zh: {},
};
