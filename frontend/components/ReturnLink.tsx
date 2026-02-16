import Link from "next/link";

export default function ReturnLink({ orderId, productSlug }: { orderId: string; productSlug: string }) {
  return (
    <Link
      href={`/dashboard/buyer/returns/new?orderId=${orderId}&productSlug=${productSlug}`}
      className="text-sm font-semibold text-brand-700"
    >
      Request return
    </Link>
  );
}
