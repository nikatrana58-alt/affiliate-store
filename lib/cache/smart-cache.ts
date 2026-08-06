/**
 * lib/cache/smart-cache.ts
 *
 * Production Intelligent Cache Engine using Next.js unstable_cache
 * and tag-based invalidation (revalidateTag).
 */

import { unstable_cache, revalidateTag } from "next/cache";
import { getProducts, getProductBySlug, type Product } from "@/lib/products";
import { searchEngine } from "@/lib/search/engine";
import type { ProductFilterOptions, SearchResult } from "@/lib/sync/types";

/**
 * Returns cached list of all products. Revalidated via 'products' tag.
 */
export const getCachedProducts = unstable_cache(
  async (): Promise<Product[]> => {
    return await getProducts();
  },
  ["products-all-list"],
  {
    revalidate: 3600, // 1 hour TTL fallback
    tags: ["products"],
  }
);

/**
 * Returns cached product detail by slug. Revalidated via 'products' tag.
 */
export async function getCachedProductBySlug(slug: string): Promise<Product | null> {
  const fetcher = unstable_cache(
    async (s: string) => getProductBySlug(s),
    [`product-detail-${slug}`],
    {
      revalidate: 3600,
      tags: ["products", `product-${slug}`],
    }
  );
  return fetcher(slug);
}

/**
 * Returns cached multi-faceted search result.
 */
export async function getCachedSearchResult(options: ProductFilterOptions): Promise<SearchResult> {
  const cacheKey = `search-${JSON.stringify(options)}`;
  const fetcher = unstable_cache(
    async () => searchEngine.searchProducts(options),
    [cacheKey],
    {
      revalidate: 1800, // 30 mins
      tags: ["products", "search"],
    }
  );
  return fetcher();
}

/**
 * Returns cached categories summary. Revalidated via 'categories' tag.
 */
export const getCachedCategories = unstable_cache(
  async () => {
    return searchEngine.getCategoriesWithCount();
  },
  ["categories-summary"],
  {
    revalidate: 3600,
    tags: ["categories", "products"],
  }
);

/**
 * Returns cached collections summary. Revalidated via 'collections' tag.
 */
export const getCachedCollections = unstable_cache(
  async () => {
    return searchEngine.getCollectionsWithCount();
  },
  ["collections-summary"],
  {
    revalidate: 3600,
    tags: ["collections", "products"],
  }
);

/**
 * Flushes product and catalog cache tags across the application.
 */
export function invalidateProductCache(): void {
  try {
    revalidateTag("products", { expire: 0 });
    revalidateTag("categories", { expire: 0 });
    revalidateTag("collections", { expire: 0 });
    revalidateTag("search", { expire: 0 });
    console.info("[smart-cache] Product & catalog cache tags successfully invalidated.");
  } catch (err) {
    console.warn("[smart-cache] Tag invalidation call in script/edge context:", err);
  }
}
