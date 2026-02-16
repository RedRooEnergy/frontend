"use client";

import { Category } from "../../data/categories";

export default function CategorySubcategorySelector({
  categories,
  categorySlug,
  subCategorySlug,
  onCategoryChange,
  onSubCategoryChange,
  labels,
}: {
  categories: Category[];
  categorySlug: string;
  subCategorySlug: string;
  onCategoryChange: (next: string) => void;
  onSubCategoryChange: (next: string) => void;
  labels: {
    categoryLabel: string;
    subCategoryLabel: string;
    selectCategory: string;
    selectSubCategory: string;
    categoryNames: (slug: string) => string;
    subCategoryNames: (slug: string) => string;
  };
}) {
  const selectedCategory = categories.find((category) => category.slug === categorySlug);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1">
        <label className="text-sm font-semibold">{labels.categoryLabel}</label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={categorySlug}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="">{labels.selectCategory}</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {labels.categoryNames(category.slug)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold">{labels.subCategoryLabel}</label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={subCategorySlug}
          onChange={(event) => onSubCategoryChange(event.target.value)}
          disabled={!selectedCategory}
        >
          <option value="">{labels.selectSubCategory}</option>
          {(selectedCategory?.subcategories || []).map((subcategory) => (
            <option key={subcategory.slug} value={subcategory.slug}>
              {labels.subCategoryNames(subcategory.slug)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
