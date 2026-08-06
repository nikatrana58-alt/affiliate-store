/**
 * app/api/search/route.ts
 *
 * API Route: GET /api/search - Search endpoint with keyword, filters, and pagination.
 */

import { NextResponse } from "next/server";
import { searchEngine } from "@/lib/search/engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q") || searchParams.get("query") || "";
    const category = searchParams.get("category") || undefined;
    const collection = searchParams.get("collection") || undefined;
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "newest";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 12;

    const result = await searchEngine.searchProducts({
      query,
      category,
      collection,
      minPrice,
      maxPrice,
      sortBy,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Search query failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
