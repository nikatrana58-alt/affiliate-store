/**
 * app/api/featured/route.ts
 *
 * API Route: GET /api/featured - Fetch featured products for homepage and showcases.
 */

import { NextResponse } from "next/server";
import { searchEngine } from "@/lib/search/engine";

export async function GET() {
  try {
    const result = await searchEngine.searchProducts({
      limit: 8,
      sortBy: "popularity",
    });
    return NextResponse.json({ success: true, products: result.items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch featured products";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
