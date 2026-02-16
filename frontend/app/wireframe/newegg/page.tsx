"use client";

// Newegg-style homepage wireframe (placeholders only, no images or final headings)
export default function NeweggWireframe() {
  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      {/* Top utility bar */}
      <div className="bg-surface shadow-card border-b">
        <div className="max-w-6xl mx-auto px-6 py-3 grid grid-cols-3 text-sm">
          <div className="text-muted">Logo / Marketplace</div>
          <div className="flex justify-center">
            <div className="w-full max-w-xl h-10 rounded-md border bg-surface-muted" />
          </div>
          <div className="flex justify-end gap-4 text-muted">
            <span>Language</span>
            <span>Account</span>
            <span>Cart</span>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <div className="bg-surface border-b shadow-card">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6 text-sm font-semibold">
          <span className="rounded-md px-3 py-2 border bg-surface-muted">Menu</span>
          <span>How It Works</span>
          <span>Compliance</span>
          <span className="ml-auto">Contact</span>
          <span>Feedback</span>
          <span>Help Centre</span>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Hero + side promo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-64 rounded-2xl border bg-surface shadow-card flex items-center justify-center text-muted">
            Hero carousel placeholder
          </div>
          <div className="h-64 rounded-2xl border bg-surface shadow-card flex items-center justify-center text-muted">
            Freight / DDP panel
          </div>
        </div>

        {/* Category / shopping tools band */}
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border bg-surface shadow-card flex items-center justify-center text-muted"
            >
              Category tile {i + 1}
            </div>
          ))}
        </div>

        {/* Featured rail */}
        <section className="space-y-3">
          <div className="h-8 w-48 rounded-md bg-surface shadow-card border flex items-center px-3 text-muted">
            Featured Items
          </div>
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-2xl border bg-surface shadow-card flex items-center justify-center text-muted"
              >
                Card {i + 1}
              </div>
            ))}
          </div>
        </section>

        {/* Today’s Best Deals rail */}
        <section className="space-y-3">
          <div className="h-8 w-56 rounded-md bg-surface shadow-card border flex items-center px-3 text-muted">
            Today’s Best Deals
          </div>
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-2xl border bg-surface shadow-card flex items-center justify-center text-muted"
              >
                Deal {i + 1}
              </div>
            ))}
          </div>
        </section>

        {/* Spotlight / split panels */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-48 rounded-2xl border bg-surface shadow-card flex items-center justify-center text-muted">
            Spotlight banner
          </div>
          <div className="h-48 rounded-2xl border bg-surface shadow-card flex items-center justify-center text-muted">
            Utility promo
          </div>
        </div>
      </main>
    </div>
  );
}
