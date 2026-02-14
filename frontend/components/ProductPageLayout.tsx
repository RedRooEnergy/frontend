 "use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WeChatChannelIcon, { type WeChatChannelBindingStatus } from "./wechat/WeChatChannelIcon";
import { getClientRoleHeaders } from "../lib/auth/clientRoleHeaders";
import type { Product } from "../data/categories";
import { addToCart, addToWishlist, getSupplierOverrides, getSession } from "../lib/store";

interface ProductPageLayoutProps {
  product: Product;
  breadcrumbs: string;
}

export default function ProductPageLayout({ product, breadcrumbs }: ProductPageLayoutProps) {
  const session = getSession();
  const [wechatBindingStatus, setWechatBindingStatus] = useState<WeChatChannelBindingStatus>("NONE");
  const [wechatUnreadCount, setWechatUnreadCount] = useState(0);
  const { supplierOverride, price, originalPrice, compliance } = useMemo(() => {
    const overrides = getSupplierOverrides();
    const supplierOverride = overrides.find((o) => o.productSlug === product.slug);
    return {
      supplierOverride,
      price: supplierOverride?.price ?? product.price,
      originalPrice: supplierOverride?.originalPrice ?? product.originalPrice,
      compliance: supplierOverride?.complianceFlags ?? product.complianceTags,
    };
  }, [product]);

  const wechatHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("channel", "wechat");
    params.set("productId", product.slug);
    params.set("supplierId", String(supplierOverride?.supplierId || product.supplierName || "").trim());
    return `/dashboard/buyer/communications?${params.toString()}`;
  }, [product.slug, product.supplierName, supplierOverride?.supplierId]);

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
          setWechatBindingStatus("ERROR");
          setWechatUnreadCount(0);
          return;
        }
        setWechatBindingStatus((json?.bindingStatus as WeChatChannelBindingStatus) || "NONE");
        setWechatUnreadCount(Number(json?.unreadCount || 0));
      } catch {
        if (!active) return;
        setWechatBindingStatus("ERROR");
        setWechatUnreadCount(0);
      }
    }

    loadWeChatStatus();
    return () => {
      active = false;
    };
  }, [session?.role]);

  const handleAdd = () => {
    addToCart({
      productSlug: product.slug,
      name: product.name,
      qty: 1,
      price,
      supplierId: supplierOverride?.supplierId,
    });
    alert("Added to cart");
  };

  const handleWishlist = () => {
    addToWishlist({
      productSlug: product.slug,
      name: product.name,
      price,
      originalPrice,
      image: product.image,
      supplierName: product.supplierName,
    });
    alert("Saved to wish list");
  };

  return (
    <div className="min-h-screen bg-surface-muted text-strong">
      <section className="bg-brand-100">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-2">
          <div className="text-sm text-muted">{breadcrumbs}</div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-base text-muted">{product.shortDescription}</p>
        </div>
      </section>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-surface rounded-2xl shadow-card p-4 h-64 flex items-center justify-center text-muted overflow-hidden">
            <Image
              src={product.image}
              alt={product.name}
              width={640}
              height={360}
              sizes="(min-width: 1024px) 640px, 100vw"
              className="object-contain h-full w-full"
              priority={false}
            />
          </div>
          <div className="bg-surface rounded-2xl shadow-card p-4 space-y-3">
            <div className="space-y-1">
              <div className="text-lg font-bold text-brand-800">${price.toFixed(2)}</div>
              {originalPrice && <div className="text-sm line-through text-muted">${originalPrice.toFixed(2)}</div>}
            </div>
            <h2 className="text-lg font-semibold">Compliance tags</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {compliance.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-brand-200 text-brand-800 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <div>
              <h3 className="text-base font-semibold">Warranty</h3>
              <p className="text-sm text-muted">{product.warranty}</p>
            </div>
            <div>
              <h3 className="text-base font-semibold">Shipping</h3>
              <p className="text-sm text-muted">{product.shippingNote}</p>
            </div>
            <div>
              <h3 className="text-base font-semibold">Supplier contact</h3>
              <div className="mt-2 flex items-center gap-2">
                <WeChatChannelIcon
                  role="BUYER"
                  bindingStatus={wechatBindingStatus}
                  unreadCount={wechatUnreadCount}
                  href={wechatHref}
                  variant="icon"
                />
                <Link
                  href={wechatHref}
                  className="text-sm font-semibold text-brand-800 underline underline-offset-2"
                >
                  {wechatBindingStatus === "VERIFIED" ? "Contact Supplier (WeChat)" : "Connect WeChat"}
                </Link>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 bg-brand-700 text-brand-100 rounded-md py-2 font-semibold"
                onClick={handleAdd}
              >
                Add to Cart
              </button>
              <button
                className="flex-1 border border-brand-600 text-brand-800 rounded-md py-2 font-semibold"
                onClick={handleWishlist}
              >
                Save
              </button>
            </div>
          </div>
        </div>

        <section className="bg-surface rounded-2xl shadow-card p-4 space-y-3">
          <h2 className="text-lg font-semibold">Key specifications</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
            {product.keySpecs.map((spec) => (
              <li key={spec}>{spec}</li>
            ))}
          </ul>
        </section>
      </main>
      <div className="h-8" aria-hidden />
    </div>
  );
}
