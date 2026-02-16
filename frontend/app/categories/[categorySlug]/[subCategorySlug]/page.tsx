import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSubCategory, getAllSubCategoryParams } from "../../../../data/categories";
import SubCategoryPageLayout from "../../../../components/SubCategoryPageLayout";

export async function generateStaticParams() {
  return getAllSubCategoryParams();
}

export function generateMetadata({ params }: { params: { categorySlug: string; subCategorySlug: string } }): Metadata {
  const found = getSubCategory(params.categorySlug, params.subCategorySlug);
  if (!found) return {};
  const { category, subcategory } = found;
  return {
    title: `${subcategory.name} | ${category.name} | RedRooEnergy`,
    description: `${subcategory.name} product listings within ${category.name} on RedRooEnergy.`.slice(0, 160),
    alternates: { canonical: `/categories/${category.slug}/${subcategory.slug}` },
  };
}

export default function SubCategoryPage({ params }: { params: { categorySlug: string; subCategorySlug: string } }) {
  const found = getSubCategory(params.categorySlug, params.subCategorySlug);
  if (!found) return notFound();
  return <SubCategoryPageLayout category={found.category} subcategory={found.subcategory} />;
}
