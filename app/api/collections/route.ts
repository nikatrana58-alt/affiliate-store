/**
 * app/api/collections/route.ts
 *
 * API Route: GET /api/collections - List collections with product counts.
 */

import { NextResponse } from "next/server";
import { searchEngine } from "@/lib/search/engine";

export async function GET() {
  try {
    const collections = await searchEngine.getCollectionsWithCount();
    return NextResponse.json({ success: true, collections, count: collections.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch collections";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
