import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getAllProductParams } from "../../../data/categories";
import ProductPageLayout from "../../../components/ProductPageLayout";

export async function generateStaticParams() {
  return getAllProductParams();
}

export function generateMetadata({ params }: { params: { productSlug: string } }): Metadata {
  const found = getProduct(params.productSlug);
  if (!found) return {};
  const { product } = found;
  return {
    title: `${product.name} | RedRooEnergy`,
    description: `${product.name} static listing with key specs and compliance placeholders for RedRooEnergy.`.slice(0, 160),
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default function ProductPage({ params }: { params: { productSlug: string } }) {
  const found = getProduct(params.productSlug);
  if (!found) return notFound();
  const { product, category, subcategory } = found;
  const breadcrumbs = `${category.name} / ${subcategory.name}`;
  return <ProductPageLayout product={product} breadcrumbs={breadcrumbs} />;
}
