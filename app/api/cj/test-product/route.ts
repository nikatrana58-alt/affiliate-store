/**
 * GET /api/cj/test-product
 *
 * Test endpoint for CJ Open API product integration.
 * Fetches a real product from CJ API, verifies its details, variants, inventory,
 * and shipping information, logs the retrieved data, and returns the product data.
 */

import { type NextRequest } from "next/server";
import { cjDropshipping } from "@/lib/cj-dropshipping";

export async function GET(_request: NextRequest) {
  try {
    console.log("[api/cj/test-product] Fetching product list from CJ Open API...");
    const listResult = await cjDropshipping.getProductList(1, 1);

    if (!listResult.list || listResult.list.length === 0) {
      console.warn("[api/cj/test-product] No products returned from CJ API.");
      return Response.json(
        { error: "No products returned from CJ Open API" },
        { status: 404 }
      );
    }

    const firstProduct = listResult.list[0];
    console.log("[api/cj/test-product] Initial product fetched:", firstProduct.pid, firstProduct.productNameEn || firstProduct.productName);

    // Fetch full product detail including variants
    const productDetail = await cjDropshipping.getProductDetail(firstProduct.pid);
    const product = productDetail || firstProduct;

    console.log("==================== CJ PRODUCT DATA ====================");
    console.log("PID:", product.pid);
    console.log("Title (EN):", product.productNameEn || product.productName);
    console.log("SKU:", product.productSku);
    console.log("Category:", product.categoryName);
    console.log("Price:", product.sellPrice);
    console.log("Image:", product.productImage);
    console.log("Variants Count:", product.variants?.length || 0);

    let inventoryData = null;
    let shippingData = null;

    if (product.variants && product.variants.length > 0) {
      const sampleVariant = product.variants[0];
      console.log("--- SAMPLE VARIANT ---");
      console.log("VID:", sampleVariant.vid);
      console.log("SKU:", sampleVariant.variantSku);
      console.log("Key/Option:", sampleVariant.variantKey);
      console.log("Price:", sampleVariant.variantSellPrice);

      // Verify inventory retrieval
      try {
        console.log("[api/cj/test-product] Verifying inventory for VID:", sampleVariant.vid);
        inventoryData = await cjDropshipping.getInventoryByVid(sampleVariant.vid);
        console.log("Inventory Data:", JSON.stringify(inventoryData, null, 2));
      } catch (invErr) {
        console.error("[api/cj/test-product] Inventory fetch error:", invErr);
      }

      // Verify shipping information retrieval
      try {
        console.log("[api/cj/test-product] Verifying shipping information for VID:", sampleVariant.vid);
        shippingData = await cjDropshipping.getShippingInfo({
          endCountryCode: "US",
          vid: sampleVariant.vid,
          quantity: 1,
        });
        console.log("Shipping Data:", JSON.stringify(shippingData, null, 2));
      } catch (shipErr) {
        console.error("[api/cj/test-product] Shipping fetch error:", shipErr);
      }
    }
    console.log("=========================================================");

    return Response.json({
      success: true,
      product: {
        ...product,
        inventory: inventoryData,
        shipping: shippingData,
      },
    });
  } catch (error) {
    console.error("[api/cj/test-product] Error fetching product:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch test product",
      },
      { status: 500 }
    );
  }
}
