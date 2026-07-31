/**
 * GET /api/admin/cj/product/[pid]
 *
 * High-performance admin endpoint to fetch product details for a specific CJ product (PID).
 * Measures and logs detailed timing profiles for:
 *   1. CJ Product Detail API
 *   2. Database lookup (Supabase)
 *   3. Variant processing
 *   4. Image processing
 *   5. Inventory API
 *   6. Shipping API
 *   7. Response serialization
 */

import { type NextRequest } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/admin";
import { cjDropshipping, type CJShippingOption } from "@/lib/cj-dropshipping";
import { createAdminSupabaseClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pid: string }> }
) {
  const tStartTotal = performance.now();
  let tDetailMs = 0;
  let tDbMs = 0;
  let tVariantMs = 0;
  let tImgMs = 0;
  let tInvMs = 0;
  let tShipMs = 0;
  let tSerMs = 0;

  try {
    await requireCurrentAdmin();
    const { pid } = await params;
    const { searchParams } = new URL(request.url);
    const includeShipping = searchParams.get("includeShipping") === "true";
    const includeInventory = searchParams.get("includeInventory") === "true";

    if (!pid?.trim()) {
      return Response.json({ error: "Product ID (PID) is required." }, { status: 400 });
    }

    const cleanPid = pid.trim();

    // ── 1 & 2. PARALLEL EXECUTION: CJ Product Detail API & Supabase DB Lookup ──
    const tDetailStart = performance.now();
    const detailPromise = cjDropshipping.getProductDetail(cleanPid);

    const tDbStart = performance.now();
    const supabase = createAdminSupabaseClient();
    const dbPromise = supabase
      .from("products")
      .select("id, slug, title, created_at")
      .eq("cj_product_id", cleanPid)
      .maybeSingle();

    const [detail, { data: dbProduct }] = await Promise.all([detailPromise, dbPromise]);
    tDetailMs = performance.now() - tDetailStart;
    tDbMs = performance.now() - tDbStart;

    if (!detail) {
      return Response.json({ error: `Product with PID ${pid} not found on CJ Dropshipping.` }, { status: 404 });
    }

    // ── 3. VARIANT PROCESSING ───────────────────────────────────────────────
    const tVariantStart = performance.now();
    const variantsList = detail.variants || [];
    let totalStock = 0;

    const variantsWithStock = variantsList.map((variant) => {
      const stock = variant.inventoryNum != null ? Number(variant.inventoryNum) : 0;
      totalStock += stock;
      return {
        ...variant,
        inventoryNum: stock,
        totalStock: stock,
      };
    });
    tVariantMs = performance.now() - tVariantStart;

    // ── 4. IMAGE PROCESSING ────────────────────────────────────────────────
    const tImgStart = performance.now();
    const galleryImages: string[] = [];
    if (detail.productImage) galleryImages.push(detail.productImage);
    if (detail.productImageSet) {
      if (Array.isArray(detail.productImageSet)) {
        galleryImages.push(...detail.productImageSet.filter((img): img is string => typeof img === "string"));
      } else if (typeof detail.productImageSet === "string" && detail.productImageSet.startsWith("[")) {
        try {
          const parsed = JSON.parse(detail.productImageSet);
          if (Array.isArray(parsed)) galleryImages.push(...parsed.filter((img): img is string => typeof img === "string"));
        } catch {}
      }
    }
    const processedImages = Array.from(new Set(galleryImages.filter(Boolean)));
    tImgMs = performance.now() - tImgStart;

    // ── 5. INVENTORY API (Non-blocking / Deferred unless requested) ────────
    const tInvStart = performance.now();
    if (includeInventory && variantsList.length > 0 && totalStock === 0) {
      try {
        const topVid = variantsList[0].vid;
        const stockItems = await cjDropshipping.getInventoryByVid(topVid);
        const fetchedStock = stockItems.reduce((acc, item) => acc + (item.totalInventoryNum ?? 0), 0);
        if (fetchedStock > 0) totalStock = fetchedStock;
      } catch (invErr) {
        console.warn(`[api/admin/cj/product] Inventory query error for PID ${cleanPid}:`, invErr);
      }
    }
    tInvMs = performance.now() - tInvStart;

    // ── 6. SHIPPING API (Non-blocking / Deferred unless requested) ────────
    let shippingOptions: CJShippingOption[] = [];
    const tShipStart = performance.now();
    if (includeShipping && variantsList.length > 0) {
      try {
        shippingOptions = await cjDropshipping.getShippingInfo({
          endCountryCode: "US",
          vid: variantsList[0].vid,
        });
      } catch (shipErr) {
        console.warn(`[api/admin/cj/product] Shipping query failed for PID ${cleanPid}:`, shipErr);
      }
    }
    tShipMs = performance.now() - tShipStart;

    // ── 7. RESPONSE SERIALIZATION & TIMING METRICS LOGGING ─────────────────
    const tSerStart = performance.now();
    const totalExecutionMs = performance.now() - tStartTotal;
    tSerMs = performance.now() - tSerStart;

    const timings = {
      cjProductDetailApiMs: Number(tDetailMs.toFixed(2)),
      databaseLookupMs: Number(tDbMs.toFixed(2)),
      variantProcessingMs: Number(tVariantMs.toFixed(2)),
      imageProcessingMs: Number(tImgMs.toFixed(2)),
      inventoryApiMs: Number(tInvMs.toFixed(2)),
      shippingApiMs: Number(tShipMs.toFixed(2)),
      responseSerializationMs: Number(tSerMs.toFixed(2)),
      totalExecutionMs: Number(totalExecutionMs.toFixed(2)),
    };

    console.info(`[PROFILER /api/admin/cj/product/${cleanPid}]`);
    console.info(`  ├─ 1. CJ Product Detail API : ${tDetailMs.toFixed(2)} ms`);
    console.info(`  ├─ 2. Database Lookup       : ${tDbMs.toFixed(2)} ms`);
    console.info(`  ├─ 3. Variant Processing    : ${tVariantMs.toFixed(2)} ms`);
    console.info(`  ├─ 4. Image Processing      : ${tImgMs.toFixed(2)} ms`);
    console.info(`  ├─ 5. Inventory API         : ${tInvMs.toFixed(2)} ms`);
    console.info(`  ├─ 6. Shipping API          : ${tShipMs.toFixed(2)} ms`);
    console.info(`  ├─ 7. Response Serialization: ${tSerMs.toFixed(2)} ms`);
    console.info(`  └─ TOTAL EXECUTION TIME  : ${totalExecutionMs.toFixed(2)} ms`);

    return Response.json({
      product: {
        ...detail,
        variants: variantsWithStock,
        processedImages,
      },
      totalStock,
      variantsPreview: variantsWithStock,
      shippingOptions,
      alreadyImported: Boolean(dbProduct),
      importedProduct: dbProduct ?? null,
      _timings: timings,
    });
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message.toLowerCase().includes("admin"));

    console.error("[api/admin/cj/product] GET failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch product details." },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
