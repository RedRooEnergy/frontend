"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BuyerDashboardLayout from "../../../../components/BuyerDashboardLayout";
import { getBuyers, getSession, updateBuyer } from "../../../../lib/store";
import { buildE164, COUNTRY_CODES, normalizeCountryCode, normalizePhoneNumber, splitE164 } from "../../../../lib/phone";
import { recordAudit } from "../../../../lib/audit";

export default function BuyerProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+61");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [buyerType, setBuyerType] = useState<"Individual" | "SME" | "Enterprise" | "Government">("Individual");
  const [businessVerified, setBusinessVerified] = useState(false);
  const [savedProjects, setSavedProjects] = useState<string[]>([]);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [documentUpdates, setDocumentUpdates] = useState(true);
  const [complianceAlerts, setComplianceAlerts] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "buyer") {
      router.replace("/signin?role=buyer");
      return;
    }
    const buyer = getBuyers().find((b) => b.buyerId === session.userId);
    if (buyer) {
      setEmail(buyer.email);
      setName(buyer.name);
      if (buyer.phoneCountryCode || buyer.phoneNumber) {
        setCountryCode(buyer.phoneCountryCode || "+61");
        setPhoneNumber(buyer.phoneNumber || "");
      } else if (buyer.phone) {
        const split = splitE164(buyer.phone);
        setCountryCode(split.countryCode || "+61");
        setPhoneNumber(split.phoneNumber || "");
      }
      setPassword(buyer.password || "");
      setBuyerType(buyer.buyerType || "Individual");
      setBusinessVerified(Boolean(buyer.businessVerified));
      setSavedProjects(buyer.savedProjects || []);
      setOrderUpdates(buyer.notificationPrefs?.orderUpdates ?? true);
      setDocumentUpdates(buyer.notificationPrefs?.documentUpdates ?? true);
      setComplianceAlerts(buyer.notificationPrefs?.complianceAlerts ?? true);
    }
  }, [router]);

  const handleSave = () => {
    if (!email) return;
    const phone = buildE164(countryCode, phoneNumber);
    updateBuyer(email, {
      name,
      phone,
      phoneCountryCode: normalizeCountryCode(countryCode),
      phoneNumber: normalizePhoneNumber(phoneNumber),
      password,
      buyerType,
      businessVerified,
      savedProjects,
      notificationPrefs: {
        orderUpdates,
        documentUpdates,
        complianceAlerts,
      },
    });
    recordAudit("BUYER_PROFILE_UPDATED", { buyerEmail: email });
    setMessage("Profile updated (local session only).");
  };

  return (
    <BuyerDashboardLayout title="Profile & Compliance">
      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Account details</div>
          <div className="text-xs text-muted">Governed profile data</div>
        </div>
        <div className="buyer-form-grid">
          <div className="space-y-1">
            <label className="text-sm text-muted">Name</label>
            <input className="w-full" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">Buyer type</label>
            <select className="w-full" value={buyerType} onChange={(e) => setBuyerType(e.target.value as any)}>
              <option value="Individual">Individual</option>
              <option value="SME">SME</option>
              <option value="Enterprise">Enterprise</option>
              <option value="Government">Government</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">Email</label>
            <input className="w-full" value={email} disabled />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">Mobile number</label>
            <div className="buyer-form-grid">
              <div className="space-y-1">
                <label className="text-xs text-muted">Country code</label>
                <input
                  list="country-codes"
                  className="w-full"
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
              <div className="space-y-1">
                <label className="text-xs text-muted">Mobile</label>
                <input className="w-full" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="space-y-1 buyer-span-2">
            <label className="text-sm text-muted">Password (local placeholder)</label>
            <input type="password" className="w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-muted">Local-only; not production auth.</p>
          </div>
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Compliance status</div>
          <div className="text-xs text-muted">Business verification and acknowledgements</div>
        </div>
        <div className="buyer-form-grid">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={businessVerified}
              onChange={(e) => setBusinessVerified(e.target.checked)}
            />
            <span>Business verification complete (if applicable)</span>
          </label>
          <div className="text-xs text-muted">
            Buyers cannot remove verification once approved. Changes require review.
          </div>
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Saved projects</div>
          <div className="text-xs text-muted">Planning references</div>
        </div>
        <div className="space-y-2">
          {savedProjects.length === 0 ? (
            <p className="text-sm text-muted">No saved projects yet.</p>
          ) : (
            savedProjects.map((project) => (
              <div key={project} className="buyer-card">
                {project}
              </div>
            ))
          )}
          <input
            className="w-full"
            placeholder="Add a project label and press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                setSavedProjects((prev) => [...prev, e.currentTarget.value.trim()]);
                e.currentTarget.value = "";
              }
            }}
          />
        </div>
      </div>

      <div className="buyer-card">
        <div className="buyer-card-header">
          <div className="buyer-section-title">Notification preferences</div>
          <div className="text-xs text-muted">Role-scoped alerts only</div>
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={orderUpdates} onChange={(e) => setOrderUpdates(e.target.checked)} />
            Order updates
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={documentUpdates} onChange={(e) => setDocumentUpdates(e.target.checked)} />
            Document availability
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={complianceAlerts} onChange={(e) => setComplianceAlerts(e.target.checked)} />
            Compliance alerts
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold" onClick={handleSave}>
          Save changes
        </button>
      </div>
      {message && <p className="text-sm text-brand-700">{message}</p>}
    </BuyerDashboardLayout>
  );
}
