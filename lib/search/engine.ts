/**
 * lib/search/engine.ts
 *
 * Production-grade Multi-Faceted Search and Filtering Engine.
 */

import { getProducts } from "@/lib/products";
import type { ProductFilterOptions, SearchResult, CategorySummary, CollectionSummary } from "@/lib/sync/types";

export class SearchEngine {
  /**
   * Executes multi-faceted search, filtering, sorting, and pagination across catalog products.
   */
  async searchProducts(options: ProductFilterOptions = {}): Promise<SearchResult> {
    const allProducts = await getProducts();
    let filtered = [...allProducts];

    // 1. Text / Keyword Search
    if (options.query && options.query.trim()) {
      const q = options.query.trim().toLowerCase();
      filtered = filtered.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(q);
        const descMatch = p.description?.toLowerCase().includes(q) ?? false;
        const skuMatch = p.sku?.toLowerCase().includes(q) ?? false;
        const catMatch = p.category?.toLowerCase().includes(q) ?? false;
        const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        const brandMatch = p.brand?.toLowerCase().includes(q) ?? false;
        return titleMatch || descMatch || skuMatch || catMatch || tagMatch || brandMatch;
      });
    }

    // 2. Category Filter
    if (options.category && options.category.trim()) {
      const cat = options.category.trim().toLowerCase();
      filtered = filtered.filter(
        (p) => p.category && p.category.toLowerCase() === cat
      );
    }

    // 3. Collection Filter
    if (options.collection && options.collection.trim()) {
      const col = options.collection.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.collections?.some((c) => c.toLowerCase() === col) ||
          p.badge?.toLowerCase() === col
      );
    }

    // 4. Price Range Filter
    if (options.minPrice != null) {
      filtered = filtered.filter((p) => (p.price ?? 0) >= options.minPrice!);
    }
    if (options.maxPrice != null) {
      filtered = filtered.filter((p) => (p.price ?? 0) <= options.maxPrice!);
    }

    // 5. Availability / Stock Filter
    if (options.inStock) {
      filtered = filtered.filter(
        (p) => (p.inventory_quantity ?? 0) > 0 || p.status === "published"
      );
    }

    // 6. Color Filter
    if (options.color && options.color.trim()) {
      const color = options.color.trim().toLowerCase();
      filtered = filtered.filter((p) =>
        p.variants?.some(
          (v) =>
            v.color?.toLowerCase() === color ||
            v.name.toLowerCase().includes(color)
        )
      );
    }

    // 7. Size Filter
    if (options.size && options.size.trim()) {
      const size = options.size.trim().toLowerCase();
      filtered = filtered.filter((p) =>
        p.variants?.some(
          (v) =>
            v.size?.toLowerCase() === size ||
            v.name.toLowerCase().includes(size)
        )
      );
    }

    // 8. Brand Filter
    if (options.brand && options.brand.trim()) {
      const brand = options.brand.trim().toLowerCase();
      filtered = filtered.filter(
        (p) => p.brand && p.brand.toLowerCase() === brand
      );
    }

    // 9. Badge Filter
    if (options.badge && options.badge.trim()) {
      const badge = options.badge.trim().toLowerCase();
      filtered = filtered.filter(
        (p) => p.badge && p.badge.toLowerCase() === badge
      );
    }

    // Extract Aggregates before sorting/pagination
    const categoriesMap = new Map<string, number>();
    const collectionsMap = new Map<string, number>();
    const colorsSet = new Set<string>();
    const sizesSet = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const p of filtered) {
      if (p.category) {
        categoriesMap.set(p.category, (categoriesMap.get(p.category) || 0) + 1);
      }
      if (p.collections) {
        for (const c of p.collections) {
          collectionsMap.set(c, (collectionsMap.get(c) || 0) + 1);
        }
      }
      if (p.badge) {
        collectionsMap.set(p.badge, (collectionsMap.get(p.badge) || 0) + 1);
      }
      if (p.variants) {
        for (const v of p.variants) {
          if (v.color) colorsSet.add(v.color);
          if (v.size) sizesSet.add(v.size);
        }
      }
      const price = p.price ?? 0;
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
    }

    if (minPrice === Infinity) minPrice = 0;
    if (maxPrice === -Infinity) maxPrice = 0;

    // 10. Sorting
    const sortBy = options.sortBy || "newest";
    filtered.sort((a, b) => {
      if (sortBy === "price-asc") return (a.price ?? 0) - (b.price ?? 0);
      if (sortBy === "price-desc") return (b.price ?? 0) - (a.price ?? 0);
      if (sortBy === "title-asc") return a.title.localeCompare(b.title);
      if (sortBy === "popularity") return (b.variants?.length || 0) - (a.variants?.length || 0);
      // "newest" default
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    // 11. Pagination
    const page = options.page || 1;
    const pageSize = options.limit || 12;
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      total,
      page,
      pageSize,
      totalPages,
      categories: Array.from(categoriesMap.entries()).map(([name, count]) => ({ name, count })),
      collections: Array.from(collectionsMap.entries()).map(([name, count]) => ({ name, count })),
      availableColors: Array.from(colorsSet),
      availableSizes: Array.from(sizesSet),
      priceRange: { min: minPrice, max: maxPrice },
    };
  }

  /**
   * Retrieves summary of all categories with product counts.
   */
  async getCategoriesWithCount(): Promise<CategorySummary[]> {
    const products = await getProducts();
    const map = new Map<string, { count: number; image?: string }>();

    for (const p of products) {
      if (p.category) {
        const existing = map.get(p.category) || { count: 0, image: p.image || undefined };
        map.set(p.category, {
          count: existing.count + 1,
          image: existing.image || p.image || undefined,
        });
      }
    }

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      count: data.count,
      image: data.image,
    }));
  }

  /**
   * Retrieves summary of all collections with product counts.
   */
  async getCollectionsWithCount(): Promise<CollectionSummary[]> {
    const products = await getProducts();
    const map = new Map<string, { count: number; image?: string }>();

    for (const p of products) {
      const items = [...(p.collections || []), p.badge].filter(Boolean) as string[];
      for (const col of items) {
        const existing = map.get(col) || { count: 0, image: p.image || undefined };
        map.set(col, {
          count: existing.count + 1,
          image: existing.image || p.image || undefined,
        });
      }
    }

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      count: data.count,
      image: data.image,
    }));
  }
}

export const searchEngine = new SearchEngine();
