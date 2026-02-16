"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, getUserContact, upsertUserContact } from "../lib/store";
import { buildE164, COUNTRY_CODES, normalizeCountryCode, normalizePhoneNumber, splitE164 } from "../lib/phone";

type ProfileLabels = {
  title: string;
  email: string;
  mobileNumber: string;
  countryCode: string;
  mobile: string;
  save: string;
  updated: string;
};

const defaultLabels: ProfileLabels = {
  title: "Profile",
  email: "Email",
  mobileNumber: "Mobile number",
  countryCode: "Country code",
  mobile: "Mobile",
  save: "Save changes",
  updated: "Profile updated.",
};

export default function ProfilePhoneForm({
  role,
  title,
  labels,
}: {
  role: "supplier" | "service-partner" | "admin";
  title: string;
  labels?: Partial<ProfileLabels>;
}) {
  const router = useRouter();
  const mergedLabels = { ...defaultLabels, title, ...labels };
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+61");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== role) {
      router.replace(`/signin?role=${role}`);
      return;
    }
    setEmail(session.email);
    const contact = getUserContact(role, session.email);
    if (contact?.phoneCountryCode || contact?.phoneNumber) {
      setCountryCode(contact.phoneCountryCode || "+61");
      setPhoneNumber(contact.phoneNumber || "");
    } else if (contact?.phone) {
      const split = splitE164(contact.phone);
      setCountryCode(split.countryCode || "+61");
      setPhoneNumber(split.phoneNumber || "");
    }
  }, [router, role]);

  const handleSave = () => {
    if (!email) return;
    const phone = buildE164(countryCode, phoneNumber);
    upsertUserContact({
      role,
      email,
      phone,
      phoneCountryCode: normalizeCountryCode(countryCode),
      phoneNumber: normalizePhoneNumber(phoneNumber),
      updatedAt: new Date().toISOString(),
    });
    setMessage(mergedLabels.updated);
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-2xl font-bold">{mergedLabels.title}</h1>
        <div className="bg-surface rounded-2xl shadow-card border p-5 space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-muted">{mergedLabels.email}</label>
            <input className="w-full border rounded-md px-3 py-2" value={email} disabled />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">{mergedLabels.mobileNumber}</label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted">{mergedLabels.countryCode}</label>
                <input
                  list="country-codes"
                  className="w-full border rounded-md px-3 py-2"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                />
                <datalist id="country-codes">
                  {COUNTRY_CODES.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.label}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs text-muted">{mergedLabels.mobile}</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold" onClick={handleSave}>
              {mergedLabels.save}
            </button>
          </div>
          {message && <p className="text-sm text-brand-700">{message}</p>}
        </div>
      </main>
    </div>
  );
}
