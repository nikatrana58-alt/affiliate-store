/**
 * app/api/printful/products/route.ts
 *
 * API Route: GET /api/printful/products - List catalog or sync products.
 * API Route: POST /api/printful/products - Sync a Printful product to local database.
 */

import { NextResponse } from "next/server";
import { printfulService } from "@/lib/printful/service";
import { PrintfulProductSearchSchema, PrintfulSyncProductInputSchema } from "@/lib/printful/validation";
import { PrintfulError } from "@/lib/printful/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category_id = searchParams.get("category_id") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") || "20";
    const offset = searchParams.get("offset") || "0";
    const type = searchParams.get("type") || "catalog"; // "catalog" | "sync"

    const parsed = PrintfulProductSearchSchema.safeParse({
      category_id,
      search,
      limit,
      offset,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid search parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    if (type === "sync") {
      const res = await printfulService.getSyncProducts({
        search: parsed.data.search,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      });
      return NextResponse.json({ success: true, type: "sync", data: res.products, total: res.total });
    }

    const res = await printfulService.getProducts({
      category_id: parsed.data.category_id,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ success: true, type: "catalog", data: res.products, total: res.total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = PrintfulSyncProductInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const product = await printfulService.syncProduct(
      parsed.data.sync_product_id,
      parsed.data.markup_percent
    );

    return NextResponse.json({ success: true, message: "Product synced successfully", product });
  } catch (error: unknown) {
    const message = error instanceof PrintfulError ? error.message : "Failed to sync product";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
