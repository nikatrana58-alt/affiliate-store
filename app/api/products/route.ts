/**
 * app/api/products/route.ts
 *
 * API Route: GET /api/products - Query catalog products with search, multi-faceted filters,
 * pagination, and sorting.
 */

import { NextResponse } from "next/server";
import { searchEngine } from "@/lib/search/engine";
import type { ProductFilterOptions } from "@/lib/sync/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const filterOptions: ProductFilterOptions = {
      query: searchParams.get("q") || searchParams.get("query") || undefined,
      category: searchParams.get("category") || undefined,
      collection: searchParams.get("collection") || undefined,
      minPrice: searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined,
      maxPrice: searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined,
      color: searchParams.get("color") || undefined,
      size: searchParams.get("size") || undefined,
      brand: searchParams.get("brand") || undefined,
      badge: searchParams.get("badge") || undefined,
      inStock: searchParams.get("inStock") === "true",
      sortBy: (searchParams.get("sortBy") as ProductFilterOptions["sortBy"]) || "newest",
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 12,
    };

    const result = await searchEngine.searchProducts(filterOptions);
    return NextResponse.json(
      { success: true, ...result },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
