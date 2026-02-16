import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory, getAllCategoryParams } from "../../../data/categories";
import CategoryPageLayout from "../../../components/CategoryPageLayout";

export async function generateStaticParams() {
  return getAllCategoryParams();
}

export function generateMetadata({ params }: { params: { categorySlug: string } }): Metadata {
  const category = getCategory(params.categorySlug);
  if (!category) return {};
  return {
    title: `${category.name} | RedRooEnergy`,
    description: `${category.name} overview and sub-categories for the RedRooEnergy marketplace.`.slice(0, 160),
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default function CategoryPage({ params }: { params: { categorySlug: string } }) {
  const category = getCategory(params.categorySlug);
  if (!category) return notFound();

  return (
    <CategoryPageLayout
      title={category.name}
      subtitle={category.description}
      subcategories={category.subcategories}
      complianceNote="Compliance and suitability depend on project location and standards; check product documentation for specifics."
    />
  );
}
