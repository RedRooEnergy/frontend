"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import MegaMenu from "./MegaMenu";
import DashboardsMenu from "./DashboardsMenu";
import MessageBell from "./MessageBell";
import WeChatChannelIcon, { type WeChatChannelBindingStatus } from "./wechat/WeChatChannelIcon";
import { getClientRoleHeaders } from "../lib/auth/clientRoleHeaders";
import { useI18n } from "./I18nProvider";
import { getSession } from "../lib/store";

const docGroups = [
  {
    title: "Core Legal & Consumer Documents",
    links: [
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "Marketplace Terms & Conditions", href: "/marketplace-terms" },
      { label: "Buyer Terms", href: "/buyer-terms" },
      { label: "Supplier Terms", href: "/supplier-terms" },
      { label: "Installer / Service Partner Terms", href: "/installer-service-partner-terms" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Cookie Policy", href: "/cookie-policy" },
      { label: "Data Retention Policy", href: "/data-retention-summary" },
      { label: "Acceptable Use Policy", href: "/acceptable-use-policy" },
      { label: "Modern Slavery Statement", href: "/modern-slavery-statement" },
      { label: "Accessibility Statement", href: "/accessibility-statement" },
      { label: "Website Disclaimer", href: "/website-disclaimer" },
      { label: "Limitation of Liability Notice", href: "/limitation-of-liability" },
    ],
  },
  {
    title: "Commerce, Orders & Payments",
    links: [
      { label: "Product Catalogue Overview", href: "/product-catalogue-overview" },
      { label: "Pricing & Fees Overview", href: "/pricing-fees-overview" },
      { label: "Payment Methods", href: "/payment-methods" },
      { label: "Escrow & Settlement Overview", href: "/escrow-settlement-overview" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Returns Policy", href: "/returns-policy" },
      { label: "Dispute Resolution Process", href: "/dispute-resolution" },
      { label: "Chargeback Handling Policy", href: "/chargeback-handling" },
      { label: "GST & Tax Information", href: "/gst-tax-information" },
      { label: "Invoicing & Receipts", href: "/invoicing-receipts" },
      { label: "Promotions & Discount Terms", href: "/promotions-discount-terms" },
    ],
  },
  {
    title: "Shipping, Delivery & Logistics",
    links: [
      { label: "Shipping & Delivery Policy", href: "/shipping-delivery-policy" },
      { label: "Delivered Duty Paid (DDP) Explanation", href: "/ddp-explanation" },
      { label: "Estimated Delivery Times", href: "/estimated-delivery-times" },
      { label: "Customs, Duties & Import Overview", href: "/customs-duties-imports" },
      { label: "Freight Damage & Loss Policy", href: "/freight-damage-loss" },
      { label: "Tracking & Notifications Policy", href: "/tracking-notifications" },
      { label: "Failed Delivery & Redelivery Rules", href: "/failed-delivery-redelivery" },
    ],
  },
  {
    title: "Compliance, Certification & Standards",
    links: [
      { label: "Compliance & Certification Overview", href: "/compliance-certification-overview" },
      { label: "CEC Compliance Statement", href: "/cec-compliance" },
      { label: "RCM / EESS Compliance Statement", href: "/rcm-eess-compliance" },
      { label: "Electrical Safety & Product Standards", href: "/electrical-safety-standards" },
      { label: "Installer Accreditation Requirements", href: "/installer-accreditation" },
      { label: "Warranty & Compliance Verification Process", href: "/warranty-compliance-verification" },
      { label: "Product Approval & Rejection Criteria", href: "/product-approval-rejection" },
      { label: "Regulatory Cooperation Statement", href: "/regulatory-cooperation" },
    ],
  },
  {
    title: "Warranties, Guarantees & Support",
    links: [
      { label: "Product Warranty Policy", href: "/product-warranty-policy" },
      { label: "Manufacturer Warranty Terms", href: "/manufacturer-warranty" },
      { label: "Installer Workmanship Warranty", href: "/installer-workmanship-warranty" },
      { label: "Warranty Claims Process", href: "/warranty-claims-process" },
      { label: "Warranty Exclusions", href: "/warranty-exclusions" },
      { label: "Extended Warranty Options", href: "/extended-warranty-options" },
    ],
  },
  {
    title: "Marketplace Governance & Trust",
    links: [
      { label: "How RedRooEnergy Works", href: "/how-redrooenergy-works" },
      { label: "Marketplace Governance Overview", href: "/marketplace-governance" },
      { label: "Supplier Vetting Process", href: "/supplier-vetting" },
      { label: "Installer & Partner Vetting Process", href: "/installer-partner-vetting" },
      { label: "Conflict of Interest Policy", href: "/conflict-of-interest-summary" },
      { label: "Risk & Incident Reporting", href: "/risk-incident-reporting" },
      { label: "Audit & Oversight Overview", href: "/audit-oversight" },
    ],
  },
  {
    title: "Platform Use, Accounts & Security",
    links: [
      { label: "Account Creation & Management", href: "/account-creation-management" },
      { label: "Identity & Verification Overview", href: "/identity-verification" },
      { label: "Data Protection & Platform Security", href: "/data-protection-security" },
      { label: "Responsible Disclosure Policy", href: "/responsible-disclosure" },
      { label: "Platform Availability & Maintenance", href: "/platform-availability" },
      { label: "Account Suspension & Termination Policy", href: "/account-suspension-termination" },
    ],
  },
  {
    title: "Help, Support & Information",
    links: [
      { label: "Help Centre", href: "/help-centre" },
      { label: "FAQs", href: "/faqs" },
      { label: "Contact Us", href: "/contact" },
      { label: "Support Ticket Submission", href: "/support-ticket-submission" },
      { label: "Complaints Handling Process", href: "/complaints-handling" },
      { label: "Feedback & Suggestions", href: "/feedback-suggestions" },
    ],
  },
  {
    title: "Company, Corporate & Transparency",
    links: [
      { label: "About RedRooEnergy", href: "/about-redrooenergy" },
      { label: "Our Mission & Values", href: "/mission-values" },
      { label: "Corporate Structure Overview", href: "/corporate-structure" },
      { label: "Careers", href: "/careers" },
      { label: "News & Announcements", href: "/news-announcements" },
      { label: "Media & Press Kit", href: "/media-press-kit" },
      { label: "Investor & Partner Enquiries", href: "/investor-partner-enquiries" },
    ],
  },
  {
    title: "Regional & Network Alignment",
    links: [
      { label: "Queensland Regional Energy Statement", href: "/queensland-energy-statement" },
      { label: "Ergon-Compatible Systems Statement", href: "/ergon-compatible-systems" },
      { label: "Export Limits & Network Compliance", href: "/export-limits-network-compliance" },
      { label: "Installer Network Coverage", href: "/installer-network-coverage" },
    ],
  },
  {
    title: "Footer Secondary Links",
    links: [
      { label: "Sitemap", href: "/sitemap" },
      { label: "Platform Status Page", href: "/platform-status" },
      { label: "Changelog / Platform Updates", href: "/changelog" },
      { label: "Legal Notices Archive", href: "/legal-notices-archive" },
      { label: "Policy Version History", href: "/policy-version-history" },
    ],
  },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const { language, setLanguage } = useI18n();
  const session = getSession();
  const [buyerWeChatStatus, setBuyerWeChatStatus] = useState<WeChatChannelBindingStatus>("NONE");
  const [buyerWeChatUnreadCount, setBuyerWeChatUnreadCount] = useState(0);
  const isGuestBuyer = session?.role === "buyer" && session.userId === "guest-buyer";
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dashTriggerRef = useRef<HTMLButtonElement>(null);
  const docsTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const handleEsc = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      };
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open]);

  useEffect(() => {
    if (docsOpen) {
      const handleEsc = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setDocsOpen(false);
          docsTriggerRef.current?.focus();
        }
      };
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [docsOpen]);

  useEffect(() => {
    if (!session || session.role !== "buyer") return;
    let active = true;

    async function loadWeChatStatus() {
      try {
        const response = await fetch("/api/wechat/channel-status", {
          method: "GET",
          headers: getClientRoleHeaders("buyer"),
          cache: "no-store",
        });
        const json = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) {
          setBuyerWeChatStatus("ERROR");
          setBuyerWeChatUnreadCount(0);
          return;
        }
        setBuyerWeChatStatus((json?.bindingStatus as WeChatChannelBindingStatus) || "NONE");
        setBuyerWeChatUnreadCount(Number(json?.unreadCount || 0));
      } catch {
        if (!active) return;
        setBuyerWeChatStatus("ERROR");
        setBuyerWeChatUnreadCount(0);
      }
    }

    loadWeChatStatus();
    return () => {
      active = false;
    };
  }, [session?.role]);

  return (
    <>
      <header className="w-full text-text-700 shadow-soft">
        {/* Top utility bar */}
        <div className="w-full bg-brand-900">
          <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <Link href="/today-deals">Today&apos;s Best Deals</Link>
              <Link href="/best-sellers">Best Sellers</Link>
              <Link href="/help-centre-faqs">Help Centre</Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/orders">Orders</Link>
              <Link href="/wish-list">Wish List</Link>
            </div>
          </div>
        </div>

        {/* Main bar */}
        <div className="w-full bg-brand-800">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
            <Link href="/" aria-label="Home" className="flex items-center gap-3">
              <Image
                src="/brand/RRE_Logo.png"
                alt="RedRooEnergy"
                width={96}
                height={48}
                className="h-12 w-auto"
                priority
              />
              <div className="flex flex-col leading-tight">
                <span className="text-xs uppercase tracking-wide text-brand-200">RedRooEnergy</span>
                <span className="text-lg font-semibold text-brand-100">Marketplace</span>
              </div>
            </Link>

            <div className="flex-1">
              <label className="w-full h-12 flex items-center bg-surface rounded-full px-4 gap-3 shadow-card">
                <input
                  type="search"
                  placeholder="Search products, categories, solutions"
                  className="w-full bg-transparent text-sm text-strong outline-none"
                />
              </label>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <div className="h-12 flex items-center gap-2 rounded-full bg-surface border px-2 text-xs">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                    language === "en" ? "bg-brand-100 font-semibold" : ""
                  }`}
                  aria-label="Switch to English"
                  aria-pressed={language === "en"}
                >
                  🇦🇺 EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("zh")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                    language === "zh" ? "bg-brand-100 font-semibold" : ""
                  }`}
                  aria-label="切换到中文"
                  aria-pressed={language === "zh"}
                >
                  🇨🇳 中文
                </button>
              </div>

              {isGuestBuyer && (
                <span className="px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
                  Guest Buyer
                </span>
              )}

              {session?.role === "buyer" ? (
                <WeChatChannelIcon
                  role="BUYER"
                  bindingStatus={buyerWeChatStatus}
                  unreadCount={buyerWeChatUnreadCount}
                  href="/dashboard/buyer/communications?channel=wechat"
                  variant="icon"
                />
              ) : null}

              <MessageBell />

              <Link
                href="/cart"
                className="h-12 px-4 rounded-full border border-2 bg-surface flex items-center gap-2 text-sm font-semibold text-brand-700 border-brand-700"
                aria-label="Cart"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 64 64"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M56 32a24 24 0 1 1-24-24"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path d="M16 14c6 0 10 4 10 10-6 0-10-4-10-10z" fill="var(--brand-600)" />
                  <path d="M30 12c7 0 12 5 12 12-7 0-12-5-12-12z" fill="currentColor" />
                  <path
                    d="M14 20h5l3.5 18a3 3 0 003 2.4h17.5a3 3 0 002.8-2.1L52 26H23"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="26" cy="46" r="3" fill="currentColor" />
                  <circle cx="42" cy="46" r="3" fill="currentColor" />
                  <path
                    d="M36 29c2.8 0 5 2.2 5 5s-2.2 5-5 5-5-2.2-5-5 2.2-5 5-5z"
                    fill="currentColor"
                  />
                  <path d="M33.5 34.5c2-.2 3.5-1.2 4.3-3" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Cart
              </Link>
            </div>
          </div>
        </div>

        {/* Category bar */}
        <div className="w-full bg-brand-700">
          <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between text-sm relative">
            <div className="flex items-center gap-4">
              <div className="relative">
              <button
                ref={docsTriggerRef}
                type="button"
                className="px-3 py-2 rounded-full bg-surface text-text-700 font-semibold border"
                aria-haspopup="true"
                aria-expanded={docsOpen}
                aria-controls="documents-menu"
                onClick={() => setDocsOpen((v) => !v)}
              >
                Documents & Policies
              </button>
              {docsOpen && (
                <div
                  id="documents-menu"
                  role="menu"
                  aria-label="Documents and policies"
                  className="absolute left-0 mt-2 z-40 w-[340px] max-h-[520px] overflow-y-auto bg-surface text-text-700 rounded-lg shadow-card border"
                >
                  <div className="p-3 space-y-2 text-sm">
                    {docGroups.map((group, idx) => (
                      <div key={group.title} className="space-y-2">
                        <button
                          role="menuitem"
                          onMouseEnter={() => setActiveGroup(idx)}
                          onFocus={() => setActiveGroup(idx)}
                          className={`w-full text-left px-2 py-2 rounded-md hover:bg-brand-100 ${
                            activeGroup === idx ? "bg-brand-100 font-semibold" : ""
                          }`}
                        >
                          {group.title}
                        </button>
                        {activeGroup === idx && (
                          <div className="pl-3 grid grid-cols-1 gap-2 text-sm">
                            {group.links.map((link) => (
                              <Link key={link.href} role="menuitem" href={link.href} className="hover:text-brand-800">
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                ref={triggerRef}
                type="button"
                className="px-3 py-2 rounded-full bg-surface text-text-700 font-semibold border"
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls="mega-menu"
                onClick={() => setOpen((v) => !v)}
              >
                Categories
              </button>
            </div>
            <Link
              href="/catalogue"
              className="px-3 py-2 rounded-full bg-surface text-text-700 font-semibold border"
            >
              Catalogue Download
            </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/signin"
                className="px-3 py-2 rounded-full bg-surface text-text-700 font-semibold border"
              >
                Sign In / Register
              </Link>
              <div className="relative">
                <button
                  ref={dashTriggerRef}
                  type="button"
                  className="px-3 py-2 rounded-full bg-surface text-text-700 font-semibold border"
                  aria-haspopup="true"
                  aria-expanded={dashOpen}
                  aria-controls="dashboards-menu"
                  onClick={() => setDashOpen((v) => !v)}
                >
                  Dashboards
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <MegaMenu open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} />
      <DashboardsMenu open={dashOpen} onClose={() => setDashOpen(false)} triggerRef={dashTriggerRef} />
    </>
  );
}
