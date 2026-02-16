"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addAuthAttempt,
  addBuyer,
  BuyerRecord,
  getBuyers,
  getUserContact,
  setSession,
  upsertUserContact,
  updateBuyer,
} from "../lib/store";
import { buildE164, COUNTRY_CODES, normalizeCountryCode, normalizePhoneNumber } from "../lib/phone";

type AuthTab = "signin" | "register" | "forgot";

const roleRoutes: Record<string, string> = {
  buyer: "/dashboard/buyer",
  supplier: "/dashboard/supplier",
  "service-partner": "/dashboard/service-partner",
  freight: "/dashboard/freight",
  regulator: "/dashboard/regulator",
  admin: "/dashboard/admin/executive",
};

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`auth-tab ${active ? "is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function AuthTabs({ defaultTab = "signin", initialRole = "buyer" }: { defaultTab?: AuthTab; initialRole?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>(defaultTab);
  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("+61");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const isDev = process.env.NODE_ENV !== "production";

  const targetRoute = useMemo(() => roleRoutes[role] || "/dashboard/buyer", [role]);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    if (tab !== "signin" || !email) return;
    if (role === "buyer") {
      const buyer = getBuyers().find((b) => b.email === email);
      if (buyer?.phoneCountryCode || buyer?.phoneNumber) {
        setCountryCode(buyer.phoneCountryCode || "+61");
        setPhoneNumber(buyer.phoneNumber || "");
      }
      return;
    }
    const contact = getUserContact(role as any, email);
    if (contact?.phoneCountryCode || contact?.phoneNumber) {
      setCountryCode(contact.phoneCountryCode || "+61");
      setPhoneNumber(contact.phoneNumber || "");
    }
  }, [email, role, tab]);

  const logAttempt = (data: {
    type: "SIGN_IN" | "SIGN_UP" | "FORGOT_PASSWORD";
    status: "REQUESTED" | "SUCCESS" | "FAILED";
    step?: string;
    error?: string;
  }) => {
    addAuthAttempt({
      id: crypto.randomUUID(),
      type: data.type,
      status: data.status,
      role: role as any,
      email,
      phone: buildE164(countryCode, phoneNumber),
      step: data.step,
      error: data.error,
      createdAt: new Date().toISOString(),
    });
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (step === "credentials") {
      await startMfa();
      return;
    }
    await verifyMfa();
  };

  const startMfa = async () => {
    setStatus("");
    const phone = buildE164(countryCode, phoneNumber);
    if (!phone) {
      setStatus("Enter a valid country code and mobile number.");
      logAttempt({ type: "SIGN_IN", status: "FAILED", step: "SEND_CODES", error: "Missing phone" });
      return;
    }
    if (role === "buyer") {
      const buyer = getBuyers().find((b) => b.email === email);
      if (!buyer) {
        setStatus("Buyer not found. Please register first.");
        logAttempt({ type: "SIGN_IN", status: "FAILED", step: "SEND_CODES", error: "Buyer not found" });
        return;
      }
    }
    setLoading(true);
    logAttempt({ type: "SIGN_IN", status: "REQUESTED", step: "SEND_CODES" });
    try {
      const res = await fetch("/api/auth/mfa/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Unable to send verification codes.");
      }
      setStep("mfa");
      if (data.devMode && data.emailCode && data.smsCode) {
        setEmailCode(String(data.emailCode));
        setSmsCode(String(data.smsCode));
        setStatus(
          `Dev mode: codes prefilled (email ${data.emailCode}, SMS ${data.smsCode}). Click Verify and sign in.`
        );
      } else {
        setStatus("Verification codes sent to your email and mobile.");
      }
      logAttempt({ type: "SIGN_IN", status: "SUCCESS", step: "SEND_CODES" });
    } catch (err: any) {
      setStatus(err.message || "Unable to send verification codes.");
      logAttempt({ type: "SIGN_IN", status: "FAILED", step: "SEND_CODES", error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async () => {
    setStatus("");
    setLoading(true);
    logAttempt({ type: "SIGN_IN", status: "REQUESTED", step: "VERIFY_CODES" });
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, emailCode, smsCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Verification failed.");
      }
      let userId = `${role}-user`;
      if (role === "buyer") {
        const buyer = getBuyers().find((b) => b.email === email);
        if (!buyer) {
          throw new Error("Buyer not found. Please register first.");
        }
        userId = buyer.buyerId;
        const phone = buildE164(countryCode, phoneNumber);
        updateBuyer(email, {
          phone,
          phoneCountryCode: normalizeCountryCode(countryCode),
          phoneNumber: normalizePhoneNumber(phoneNumber),
        });
      } else {
        const phone = buildE164(countryCode, phoneNumber);
        upsertUserContact({
          role: role as any,
          email,
          phone,
          phoneCountryCode: normalizeCountryCode(countryCode),
          phoneNumber: normalizePhoneNumber(phoneNumber),
          updatedAt: new Date().toISOString(),
        });
      }
      logAttempt({ type: "SIGN_IN", status: "SUCCESS", step: "VERIFY_CODES" });
      setSession({ role: role as any, userId, email });
      router.push(targetRoute);
    } catch (err: any) {
      setStatus(err.message || "Verification failed.");
      logAttempt({ type: "SIGN_IN", status: "FAILED", step: "VERIFY_CODES", error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = () => {
    setStatus("");
    if (!email || !email.includes("@")) {
      setStatus("Enter a valid email to use dev sign-in.");
      return;
    }
    let userId = `${role}-user`;
    if (role === "buyer") {
      const existing = getBuyers().find((b) => b.email === email);
      const phone = buildE164(countryCode, phoneNumber);
      if (!existing) {
        const buyerId = crypto.randomUUID();
        addBuyer({
          buyerId,
          email,
          name: name || email.split("@")[0] || "Buyer",
          phone,
          phoneCountryCode: normalizeCountryCode(countryCode),
          phoneNumber: normalizePhoneNumber(phoneNumber),
          createdAt: new Date().toISOString(),
          password: password || "dev",
        });
        userId = buyerId;
      } else {
        userId = existing.buyerId;
        updateBuyer(email, {
          phone,
          phoneCountryCode: normalizeCountryCode(countryCode),
          phoneNumber: normalizePhoneNumber(phoneNumber),
        });
      }
    } else {
      const phone = buildE164(countryCode, phoneNumber);
      upsertUserContact({
        role: role as any,
        email,
        phone,
        phoneCountryCode: normalizeCountryCode(countryCode),
        phoneNumber: normalizePhoneNumber(phoneNumber),
        updatedAt: new Date().toISOString(),
      });
    }
    fetch("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, email }),
    }).catch(() => null);
    logAttempt({ type: "SIGN_IN", status: "SUCCESS", step: "DEV_LOGIN" });
    setSession({ role: role as any, userId, email });
    router.push(targetRoute);
  };

  const handleRegister = (e: FormEvent) => {
    e.preventDefault();
    setStatus("");
    logAttempt({ type: "SIGN_UP", status: "REQUESTED" });
    try {
      const buyerId = crypto.randomUUID();
      const phone = buildE164(countryCode, phoneNumber);
      const record: BuyerRecord = {
        buyerId,
        email,
        name,
        phone,
        phoneCountryCode: normalizeCountryCode(countryCode),
        phoneNumber: normalizePhoneNumber(phoneNumber),
        createdAt: new Date().toISOString(),
        password,
      };
      addBuyer(record);
      setSession({ role: "buyer", userId: buyerId, email });
      logAttempt({ type: "SIGN_UP", status: "SUCCESS" });
      router.push("/dashboard/buyer");
    } catch (err: any) {
      setStatus("Unable to create account.");
      logAttempt({ type: "SIGN_UP", status: "FAILED", error: err.message });
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("");
    logAttempt({ type: "FORGOT_PASSWORD", status: "REQUESTED" });
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Unable to send reset email.");
      }
      if (data.devMode && data.code) {
        setStatus(`Dev mode: reset code ${data.code} (no email provider configured).`);
      } else {
        setStatus("If the account exists, a reset code has been sent.");
      }
      logAttempt({ type: "FORGOT_PASSWORD", status: "SUCCESS" });
    } catch (err: any) {
      setStatus(err.message || "Unable to send reset email.");
      logAttempt({ type: "FORGOT_PASSWORD", status: "FAILED", error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const resetTabState = (nextTab: AuthTab) => {
    setTab(nextTab);
    setStatus("");
    setStep("credentials");
    setEmailCode("");
    setSmsCode("");
    if (nextTab === "register") {
      setRole("buyer");
    }
  };

  return (
    <div className="min-h-screen auth-bg">
      <div className="auth-overlay px-6">
        <div className="auth-card w-full max-w-md space-y-4">
          <div className="auth-tabs" role="tablist" aria-label="Authentication tabs">
            <TabButton label="Create Account" active={tab === "register"} onClick={() => resetTabState("register")} />
            <TabButton label="Sign In" active={tab === "signin"} onClick={() => resetTabState("signin")} />
            <TabButton label="Forgot my Password" active={tab === "forgot"} onClick={() => resetTabState("forgot")} />
          </div>

          {tab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4" aria-label="Sign in">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">Sign In</h1>
                <p className="text-sm text-muted">
                  {step === "credentials" ? "Enter your credentials to continue." : "Enter the verification codes."}
                </p>
              </div>

              {step === "credentials" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="signin-email">
                      Email or Username
                    </label>
                    <input
                      id="signin-email"
                      name="email"
                      type="text"
                      className="w-full border rounded-md px-3 py-2"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="signin-password">
                      Password
                    </label>
                    <input
                      id="signin-password"
                      name="password"
                      type="password"
                      className="w-full border rounded-md px-3 py-2"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="signin-role">
                      Role
                    </label>
                    <select
                      id="signin-role"
                      className="w-full border rounded-md px-3 py-2"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="buyer">Buyer</option>
                      <option value="supplier">Supplier</option>
                      <option value="service-partner">Service Partner</option>
                      <option value="freight">Freight & Logistics</option>
                      <option value="regulator">Regulator / Auditor</option>
                      <option value="admin">Grand-Master</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Mobile number</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted">Country code</label>
                        <input
                          list="country-codes"
                          className="w-full border rounded-md px-3 py-2"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          required
                          placeholder="+61"
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
                        <label className="text-xs text-muted">Mobile</label>
                        <input
                          className="w-full border rounded-md px-3 py-2"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          required
                          type="tel"
                          placeholder="412 345 678"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-brand-700 text-brand-100 rounded-md py-2 font-semibold"
                    disabled={loading}
                  >
                    {loading ? "Sending codes..." : "Send verification codes"}
                  </button>
                  {isDev && (
                    <button
                      type="button"
                      className="w-full border border-slate-200 rounded-md py-2 font-semibold text-sm"
                      onClick={handleDevLogin}
                    >
                      Dev: Sign in without codes
                    </button>
                  )}
                  <p className="text-xs text-muted">Role: {role}</p>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Email verification code (8 digits)</label>
                    <input
                      className="w-full border rounded-md px-3 py-2"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                      required
                      inputMode="numeric"
                      placeholder="12345678"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">SMS verification code (6 digits)</label>
                    <input
                      className="w-full border rounded-md px-3 py-2"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      required
                      inputMode="numeric"
                      placeholder="123456"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-brand-700 text-brand-100 rounded-md py-2 font-semibold"
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify and sign in"}
                  </button>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <button type="button" className="underline" onClick={() => setStep("credentials")}>
                      Back
                    </button>
                    <button type="button" className="underline" onClick={startMfa}>
                      Resend codes
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4" aria-label="Create account">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">Create Account</h1>
                <p className="text-sm text-muted">Create your buyer account to access the marketplace.</p>
              </div>
              <div className="space-y-1">
                <label htmlFor="register-name" className="text-sm font-medium">
                  Full name
                </label>
                <input
                  id="register-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="register-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="register-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Mobile number</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted">Country code</label>
                    <input
                      list="country-codes"
                      className="w-full border rounded-md px-3 py-2"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      required
                      placeholder="+61"
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
                    <label className="text-xs text-muted">Mobile</label>
                    <input
                      className="w-full border rounded-md px-3 py-2"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      type="tel"
                      placeholder="412 345 678"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="register-password" className="text-sm font-medium">
                  Password (placeholder)
                </label>
                <input
                  id="register-password"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                />
                <p className="text-xs text-muted">Local-only placeholder. Not production-grade authentication.</p>
              </div>
              <button type="submit" className="w-full bg-brand-700 text-brand-100 rounded-md py-2 font-semibold">
                Create Account
              </button>
            </form>
          )}

          {tab === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4" aria-label="Forgot password">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">Forgot my Password</h1>
                <p className="text-sm text-muted">We will email a reset code if the account exists.</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="forgot-email">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  className="w-full border rounded-md px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-brand-700 text-brand-100 rounded-md py-2 font-semibold"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset code"}
              </button>
            </form>
          )}

          {status && <p className="text-xs text-brand-700">{status}</p>}
        </div>
      </div>
    </div>
  );
}
