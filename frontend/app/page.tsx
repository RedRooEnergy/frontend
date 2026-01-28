import React, { useState } from "react";

const SIDEBAR_TOPICS = [
  "Core Legal & Consumer Documents",
  "Commerce, Orders & Payments",
  "Shipping, Delivery & Logistics",
  "Compliance, Certification & Standards",
  "Warranties, Guarantees & Support",
  "Marketplace Governance & Trust",
  "Platform Use, Accounts & Security",
  "Help, Support & Information",
  "Company, Corporate & Transparency",
  "Regional & Network Alignment",
  "Platform & Technical Information",
];

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div style={{ background: "#f6f7fb", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ background: "#1f7a8c", color: "#fff", borderRadius: "0 0 24px 24px", padding: "1rem 0.5rem 1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src="/logo.png" alt="RedRooEnergy Logo" style={{ height: 48, marginRight: 12 }} />
          <span style={{ fontWeight: 700, fontSize: 24, letterSpacing: 1, color: "#fff" }}>RedRooEnergy Marketplace</span>
          <button style={{ marginLeft: 24, background: "#fff", color: "#1f7a8c", border: 0, borderRadius: 8, padding: "0.5rem 1rem", fontWeight: 600, cursor: "pointer" }} onClick={() => setSidebarOpen((v) => !v)}>
            &#9776; Menu
          </button>
          <nav style={{ marginLeft: 16, display: "flex", gap: 8 }}>
            <a href="/how-it-works" style={{ color: "#fff", fontWeight: 500, borderRadius: 6, padding: "0.25rem 0.75rem", background: "rgba(255,255,255,0.08)" }}>How It Works</a>
            <a href="/compliance" style={{ color: "#fff", fontWeight: 500, borderRadius: 6, padding: "0.25rem 0.75rem", background: "rgba(255,255,255,0.08)" }}>Compliance</a>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Language Switcher */}
          <button style={{ background: "#fff", color: "#1f7a8c", border: 0, borderRadius: 8, padding: "0.5rem 1rem", fontWeight: 600, cursor: "pointer" }}>🇦🇺 EN</button>
          <button style={{ background: "#fff", color: "#1f7a8c", border: 0, borderRadius: 8, padding: "0.5rem 1rem", fontWeight: 600, cursor: "pointer" }}>🇨🇳 中文</button>
          <a href="/account" style={{ color: "#fff", fontWeight: 500 }}>Sign In / Register</a>
          <a href="/orders" style={{ color: "#fff", fontWeight: 500 }}>Returns & Orders</a>
          <a href="/cart" style={{ color: "#fff", fontWeight: 500 }}>🛒 3 items</a>
        </div>
      </header>

      {/* Main Content Layout */}
      <div style={{ display: "flex", maxWidth: 1400, margin: "2rem auto", gap: 32 }}>
        {/* Sidebar Dropdown Menu */}
        {sidebarOpen && (
          <aside style={{ minWidth: 320, background: "#1f7a8c", color: "#fff", borderRadius: 24, padding: "2rem 1.5rem", boxShadow: "0 2px 16px rgba(31,122,140,0.08)", height: "fit-content" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, letterSpacing: 1 }}>Categories</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {SIDEBAR_TOPICS.map((topic) => (
                <li key={topic} style={{ marginBottom: 18, fontSize: 18, fontWeight: 500, borderRadius: 8, padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.06)" }}>{topic}</li>
              ))}
            </ul>
          </aside>
        )}

        {/* Main Content */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Hero Section */}
          <section style={{ background: "linear-gradient(90deg, #e3f0f7 0%, #f6f7fb 100%)", borderRadius: 24, padding: "2rem 2rem 1.5rem 2rem", display: "flex", alignItems: "center", gap: 32, minHeight: 220 }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 36, fontWeight: 700, color: "#1f7a8c", marginBottom: 12 }}>HERO x 7 x 10 seconds</h1>
              <p style={{ fontSize: 20, color: "#1f2933" }}>Welcome to RedRooEnergy Marketplace. <br />A governed, trusted, and compliant platform for buyers, suppliers, and service partners.</p>
            </div>
            <img src="/hero-placeholder.png" alt="Hero" style={{ width: 320, borderRadius: 16, boxShadow: "0 2px 16px rgba(31,122,140,0.08)" }} />
          </section>

          {/* Info Cards Section */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: "2rem 1.5rem", boxShadow: "0 2px 12px rgba(31,122,140,0.06)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 32, marginBottom: 8 }}>✈️</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#1f7a8c" }}>Freight & Duty</h3>
              <p style={{ color: "#1f2933", textAlign: "center" }}>Script about shipping, duty and DDP</p>
              <a href="#" style={{ marginTop: 12, color: "#1f7a8c", fontWeight: 600 }}>Find Out More &gt;</a>
            </div>
            <div style={{ background: "#fff", borderRadius: 18, padding: "2rem 1.5rem", boxShadow: "0 2px 12px rgba(31,122,140,0.06)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 32, marginBottom: 8 }}>🛒</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#1f7a8c" }}>Buyers</h3>
              <p style={{ color: "#1f2933", textAlign: "center" }}>Script for Buyers</p>
              <a href="#" style={{ marginTop: 12, color: "#1f7a8c", fontWeight: 600 }}>Find Out More &gt;</a>
            </div>
            <div style={{ background: "#fff", borderRadius: 18, padding: "2rem 1.5rem", boxShadow: "0 2px 12px rgba(31,122,140,0.06)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 32, marginBottom: 8 }}>🏢</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#1f7a8c" }}>Suppliers</h3>
              <p style={{ color: "#1f2933", textAlign: "center" }}>Script about Suppliers</p>
              <a href="#" style={{ marginTop: 12, color: "#1f7a8c", fontWeight: 600 }}>Find Out More &gt;</a>
            </div>
          </section>

          {/* Service Partners Card */}
          <section style={{ display: "flex", gap: 24 }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: "2rem 1.5rem", boxShadow: "0 2px 12px rgba(31,122,140,0.06)", flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 32, marginBottom: 8 }}>⚖️</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#1f7a8c" }}>Service Partners</h3>
              <p style={{ color: "#1f2933", textAlign: "center" }}>Script about Service Partners</p>
              <a href="#" style={{ marginTop: 12, color: "#1f7a8c", fontWeight: 600 }}>Find Out More &gt;</a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
