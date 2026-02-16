export const COUNTRY_CODES = [
  { code: "+61", label: "Australia (+61)" },
  { code: "+64", label: "New Zealand (+64)" },
  { code: "+86", label: "China (+86)" },
  { code: "+60", label: "Malaysia (+60)" },
  { code: "+62", label: "Indonesia (+62)" },
  { code: "+670", label: "Timor-Leste (+670)" },
  { code: "+673", label: "Brunei (+673)" },
  { code: "+675", label: "Papua New Guinea (+675)" },
  { code: "+676", label: "Tonga (+676)" },
  { code: "+677", label: "Solomon Islands (+677)" },
  { code: "+678", label: "Vanuatu (+678)" },
  { code: "+679", label: "Fiji (+679)" },
  { code: "+680", label: "Palau (+680)" },
  { code: "+681", label: "Wallis and Futuna (+681)" },
  { code: "+682", label: "Cook Islands (+682)" },
  { code: "+683", label: "Niue (+683)" },
  { code: "+685", label: "Samoa (+685)" },
  { code: "+686", label: "Kiribati (+686)" },
  { code: "+687", label: "New Caledonia (+687)" },
  { code: "+688", label: "Tuvalu (+688)" },
  { code: "+689", label: "French Polynesia (+689)" },
  { code: "+690", label: "Tokelau (+690)" },
  { code: "+691", label: "Micronesia (+691)" },
  { code: "+692", label: "Marshall Islands (+692)" },
  { code: "+674", label: "Nauru (+674)" },
  { code: "+1-670", label: "Northern Mariana Islands (+1-670)" },
  { code: "+1-671", label: "Guam (+1-671)" },
  { code: "+1-684", label: "American Samoa (+1-684)" },
];

const SORTED_CODES = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

export function normalizeCountryCode(code: string) {
  const raw = code.trim().replace(/[^+\d]/g, "");
  if (!raw) return "";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

export function normalizePhoneNumber(value: string) {
  return value.trim().replace(/[^\d]/g, "");
}

export function buildE164(countryCode: string, phoneNumber: string) {
  const code = normalizeCountryCode(countryCode);
  const number = normalizePhoneNumber(phoneNumber);
  if (!code || !number) return "";
  return `${code}${number}`;
}

export function splitE164(value: string) {
  const normalized = normalizeCountryCode(value);
  if (!normalized) return { countryCode: "", phoneNumber: "" };
  for (const entry of SORTED_CODES) {
    if (normalized.startsWith(entry.code.replace(/[^+\d]/g, ""))) {
      return {
        countryCode: entry.code,
        phoneNumber: normalized.replace(entry.code.replace(/[^+\d]/g, ""), ""),
      };
    }
  }
  return { countryCode: normalized.slice(0, 4), phoneNumber: normalized.slice(4) };
}
