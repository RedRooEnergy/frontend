import Link from "next/link";

export default function ShoppingTools() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-6">
      <div className="bg-surface rounded-2xl shadow-card border p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold">Wish List</h2>
          <p className="text-sm text-muted">Save products you want to purchase later and return when ready.</p>
        </div>
        <Link href="/wish-list" className="px-4 py-2 bg-brand-700 text-brand-100 rounded-md font-semibold">
          View Wish List
        </Link>
      </div>
    </section>
  );
}
