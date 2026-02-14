type ProductDetailPanelProps = {
  productId: string;
  backendAvailable: boolean;
};

export default function ProductDetailPanel({ productId, backendAvailable }: ProductDetailPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Product detail</h3>
      <p className="mt-1 text-sm text-slate-600">Product ID: {productId}</p>
      {!backendAvailable ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
          NOT AVAILABLE (backend not wired)
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-600">Backend connected. Moderation controls remain disabled in B3.</p>
      )}
    </section>
  );
}
