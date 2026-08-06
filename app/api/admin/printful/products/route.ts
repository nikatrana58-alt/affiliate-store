import { NextRequest, NextResponse } from "next/server";
import { printfulService } from "@/lib/printful";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 100);
    const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);
    const keyword = searchParams.get("keyword") || searchParams.get("query") || "";
    const categoryId = searchParams.get("category") || searchParams.get("category_id");

    const syncProductsResult = await printfulService.getSyncProducts({
      limit,
      offset,
      status: "all",
    });

    const activeProducts = await getProducts();
    const importedMap = new Map<string, { id: string; slug: string }>();

    for (const lp of activeProducts) {
      if (lp.printful_sync_id) {
        importedMap.set(String(lp.printful_sync_id), { id: lp.id, slug: lp.slug });
      }
      if (lp.printful_product_id) {
        importedMap.set(String(lp.printful_product_id), { id: lp.id, slug: lp.slug });
      }
      if (lp.id.startsWith("pf-sync-")) {
        const rawId = lp.id.replace("pf-sync-", "");
        importedMap.set(rawId, { id: lp.id, slug: lp.slug });
      }
    }

    let items = syncProductsResult.products || [];

    if (keyword.trim()) {
      const kwLower = keyword.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(kwLower) ||
          String(p.id).includes(kwLower) ||
          (p.external_id && p.external_id.toLowerCase().includes(kwLower))
      );
    }

    const enrichedProducts = items.map((p) => {
      const syncIdStr = String(p.id);
      const imported = importedMap.get(syncIdStr) || null;
      return {
        ...p,
        alreadyImported: Boolean(imported),
        importedProduct: imported,
      };
    });

    return NextResponse.json({
      success: true,
      products: enrichedProducts,
      total: syncProductsResult.total || enrichedProducts.length,
      offset,
      limit,
      searchTypeDetected: keyword ? "KEYWORD" : "ALL",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: msg, products: [], total: 0 },
      { status: 500 }
    );
  }
}
