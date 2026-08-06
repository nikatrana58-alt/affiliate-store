/**
 * app/api/printful/product/[id]/route.ts
 *
 * API Route: GET /api/printful/product/[id] - Fetch detailed catalog or sync product info.
 */

import { NextResponse } from "next/server";
import { printfulService } from "@/lib/printful/service";
import { PrintfulError } from "@/lib/printful/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isSync = searchParams.get("type") === "sync";

    if (!id || id.trim() === "") {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    if (isSync) {
      const detail = await printfulService.getSyncProduct(id);
      return NextResponse.json({ success: true, type: "sync", data: detail });
    }

    const detail = await printfulService.getProduct(id);
    return NextResponse.json({ success: true, type: "catalog", data: detail });
  } catch (error: unknown) {
    const message = error instanceof PrintfulError ? error.message : "Failed to fetch product details";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
