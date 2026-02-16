import { categories, Product } from "../data/categories";

export interface BestDealItem {
  product: Product;
  qualifier: string;
  categoryName: string;
  categorySlug: string;
  subCategoryName: string;
  subCategorySlug: string;
}

export interface FeaturedItem {
  product: Product;
  categoryName: string;
}

export interface HotDealItem {
  product: Product;
  dealStart: string;
  dealEnd: string;
}

const categoryMap = new Map<string, { categoryName: string; subCategoryName: string; categorySlug: string }>();

categories.forEach((category) => {
  category.subcategories.forEach((sub) => {
    categoryMap.set(sub.slug, {
      categoryName: category.name,
      categorySlug: category.slug,
      subCategoryName: sub.name,
    });
  });
});

function getAllProducts(): Product[] {
  const list: Product[] = [];
  categories.forEach((c) => c.subcategories.forEach((s) => s.products.forEach((p) => list.push(p))));
  return list;
}

function discountScore(product: Product) {
  if (!product.originalPrice || product.originalPrice <= product.price) return 0;
  return (product.originalPrice - product.price) / product.originalPrice;
}

function complianceScore(product: Product) {
  if (product.complianceTags.includes("None")) return 0;
  return product.complianceTags.length;
}

function logisticsScore(product: Product) {
  return product.shippingNote.toLowerCase().includes("ddp") ? 1 : 0;
}

function scoreProduct(product: Product) {
  return discountScore(product) * 10 + complianceScore(product) * 1.5 + logisticsScore(product);
}

function hotDealDiscount(product: Product) {
  const original = product.hotDeal?.originalPrice ?? product.originalPrice;
  const price = product.hotDeal?.price ?? product.price;
  if (!original || original <= 0) return 0;
  return (original - price) / original;
}

function dealQualifier(product: Product) {
  const discount = discountScore(product);
  if (discount >= 0.2) return "Volume pricing";
  if (logisticsScore(product)) return "Container efficiency";
  if (complianceScore(product) >= 2) return "Compliance verified";
  return "Commercial advantage";
}

export function getBestDealsTop(limit = 5): BestDealItem[] {
  const candidates = getAllProducts().filter((p) => p.originalPrice > p.price);
  const scored = candidates
    .map((product) => {
      const meta = categoryMap.get(product.subCategorySlug);
      return {
        product,
        qualifier: dealQualifier(product),
        categoryName: meta?.categoryName ?? product.categorySlug,
        categorySlug: meta?.categorySlug ?? product.categorySlug,
        subCategoryName: meta?.subCategoryName ?? product.subCategorySlug,
        subCategorySlug: product.subCategorySlug,
        score: scoreProduct(product),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ score, ...rest }) => rest);
}

export function getBestDealsBySubCategory(categoryFilter?: string): BestDealItem[] {
  const results: BestDealItem[] = [];
  categories.forEach((category) => {
    if (categoryFilter && category.slug !== categoryFilter) return;
    category.subcategories.forEach((sub) => {
      const candidates = sub.products.filter((p) => p.originalPrice > p.price);
      const best = candidates
        .map((product) => ({
          product,
          qualifier: dealQualifier(product),
          categoryName: category.name,
          categorySlug: category.slug,
          subCategoryName: sub.name,
          subCategorySlug: sub.slug,
          score: scoreProduct(product),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)[0];
      if (best) {
        const { score, ...rest } = best;
        results.push(rest);
      }
    });
  });
  return results;
}

export function getFeaturedItemsTop(limit = 25): FeaturedItem[] {
  const now = new Date();
  return getAllProducts()
    .filter((p) => p.featuredBid && new Date(p.featuredBid.expiresAt) >= now)
    .sort((a, b) => (b.featuredBid?.amount ?? 0) - (a.featuredBid?.amount ?? 0))
    .slice(0, limit)
    .map((product) => ({
      product,
      categoryName: categoryMap.get(product.subCategorySlug)?.categoryName ?? product.categorySlug,
    }));
}

const MIN_HOT_DEAL_DISCOUNT = 0.1;

export function getHotDealsCurrentWeek(limit?: number): HotDealItem[] {
  const now = new Date();
  const list = getAllProducts()
    .filter((p) => p.hotDeal)
    .filter((p) => {
      if (!p.hotDeal) return false;
      const start = new Date(p.hotDeal.start);
      const end = new Date(p.hotDeal.end);
      if (!(now >= start && now <= end)) return false;
      if (p.complianceTags.includes("None")) return false;
      if (hotDealDiscount(p) < MIN_HOT_DEAL_DISCOUNT) return false;
      if (p.hotDeal.remainingQuantity != null && p.hotDeal.remainingQuantity <= 0) return false;
      return true;
    })
    .map((product) => ({
      product,
      dealStart: product.hotDeal?.start ?? "",
      dealEnd: product.hotDeal?.end ?? "",
    }))
    .sort((a, b) => {
      const aDiscount = (a.product.hotDeal?.originalPrice ?? 0) - (a.product.hotDeal?.price ?? 0);
      const bDiscount = (b.product.hotDeal?.originalPrice ?? 0) - (b.product.hotDeal?.price ?? 0);
      return bDiscount - aDiscount;
    });

  if (typeof limit === "number") return list.slice(0, limit);
  return list;
}
