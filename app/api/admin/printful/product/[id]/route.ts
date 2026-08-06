import { NextRequest, NextResponse } from "next/server";
import { printfulService } from "@/lib/printful";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productIdNum = Number(id);

    const productDetail = await printfulService.getSyncProduct(
      isNaN(productIdNum) ? id : productIdNum
    );

    if (!productDetail || !productDetail.sync_product) {
      return NextResponse.json(
        { success: false, error: "Printful product not found." },
        { status: 404 }
      );
    }

    const activeProducts = await getProducts();
    const existing = activeProducts.find(
      (lp) =>
        String(lp.printful_sync_id) === String(productDetail.sync_product.id) ||
        String(lp.printful_product_id) === String(productDetail.sync_product.id) ||
        lp.id === `pf-sync-${productDetail.sync_product.id}`
    );

    return NextResponse.json({
      success: true,
      product: productDetail.sync_product,
      variants: productDetail.sync_variants || [],
      alreadyImported: Boolean(existing),
      importedProduct: existing
        ? { id: existing.id, slug: existing.slug, title: existing.title }
        : null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
