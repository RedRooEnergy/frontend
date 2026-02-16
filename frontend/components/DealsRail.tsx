const deals = Array.from({ length: 6 }).map((_, i) => `Deal ${i + 1}`);

export default function DealsRail() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-6">
      <div className="mb-3 h-6 w-32 bg-brand-100 rounded" aria-hidden />
      <div className="overflow-x-auto">
        <div className="flex gap-3 pb-2">
          {deals.map((deal) => (
            <div
              key={deal}
              className="min-w-56 bg-surface rounded-2xl border shadow-card p-4 flex flex-col gap-3 hover:shadow-soft transition"
            >
              <div className="h-20 rounded-lg bg-brand-100" />
              <div className="h-4 w-5/6 bg-surface-muted rounded" />
              <div className="h-4 w-3/4 bg-surface-muted rounded" />
              <div className="h-3 w-1/3 bg-brand-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
