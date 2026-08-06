/**
 * app/api/new-arrivals/route.ts
 *
 * API Route: GET /api/new-arrivals - Fetch newest catalog products.
 */

import { NextResponse } from "next/server";
import { searchEngine } from "@/lib/search/engine";

export async function GET() {
  try {
    const result = await searchEngine.searchProducts({
      limit: 8,
      sortBy: "newest",
    });
    return NextResponse.json({ success: true, products: result.items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch new arrivals";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
