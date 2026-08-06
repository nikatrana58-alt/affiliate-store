/**
 * app/api/related/route.ts
 *
 * API Route: GET /api/related?id=...&category=... - Fetch related product recommendations from Supabase primary database.
 */

import { NextResponse } from "next/server";
import { searchEngine } from "@/lib/search/engine";
import { getProductBySlug, getProducts } from "@/lib/products";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const category = searchParams.get("category");

    let targetCategory = category || undefined;
    let excludeId: string | undefined = id || undefined;

    if (id && !category) {
      let prod = await getProductBySlug(id);
      if (!prod) {
        const all = await getProducts();
        prod = all.find((p) => p.id === id || p.cj_product_id === id) || null;
      }
      if (prod) {
        targetCategory = prod.category || undefined;
        excludeId = prod.id;
      }
    }

    const result = await searchEngine.searchProducts({
      category: targetCategory,
      limit: 6,
    });

    const related = result.items.filter((p) => p.id !== excludeId).slice(0, 4);

    return NextResponse.json({ success: true, products: related });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch related products";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
