/**
 * app/api/categories/route.ts
 *
 * API Route: GET /api/categories - List categories with product counts.
 */

import { NextResponse } from "next/server";
import { searchEngine } from "@/lib/search/engine";

export async function GET() {
  try {
    const categories = await searchEngine.getCategoriesWithCount();
    return NextResponse.json({ success: true, categories, count: categories.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch categories";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
