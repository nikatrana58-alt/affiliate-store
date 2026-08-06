/**
 * app/api/bestsellers/route.ts
 *
 * API Route: GET /api/bestsellers - Fetch bestselling / popular products.
 */

import { NextResponse } from "next/server";
import { searchEngine } from "@/lib/search/engine";

export async function GET() {
  try {
    const result = await searchEngine.searchProducts({
      limit: 8,
      badge: "Best Seller",
      sortBy: "popularity",
    });

    // Fallback if badge search returns few items
    if (result.items.length < 4) {
      const fallback = await searchEngine.searchProducts({
        limit: 8,
        sortBy: "popularity",
      });
      return NextResponse.json({ success: true, products: fallback.items });
    }

    return NextResponse.json({ success: true, products: result.items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch best sellers";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
