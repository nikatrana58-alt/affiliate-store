/**
 * app/api/products/[id]/route.ts
 *
 * API Route: GET /api/products/[id] - Fetch detailed product by ID or Slug from Supabase primary database.
 */

import { NextResponse } from "next/server";
import { getProductBySlug, getProducts } from "@/lib/products";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Product identifier is required" }, { status: 400 });
    }

    let product = await getProductBySlug(id);

    if (!product) {
      const all = await getProducts();
      product = all.find((p) => p.id === id || p.cj_product_id === id || p.printful_sync_id === id) || null;
    }

    if (!product) {
      return NextResponse.json({ success: false, error: `Product not found: ${id}` }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch product";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
