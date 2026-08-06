/**
 * lib/printful-import.ts
 *
 * Printful → Store Product Import Engine.
 *
 * Fetches Printful sync products/variants and imports them directly into PostgreSQL (Supabase).
 * No JSON file writes in production.
 */

import { printfulService, type PrintfulSyncVariant } from "@/lib/printful";
import { calculateProductPricing } from "@/lib/pricing-engine";
import { getProducts, getUniqueSlug, saveProduct } from "@/lib/products";
import { createAdminSupabaseClient } from "@/lib/supabase";

export type PrintfulImportOptions = {
  sync_product_id?: string | number;
  action?: "import" | "update" | "duplicate";
  markup_percent?: number;
};

export type PrintfulImportReport = {
  status: "imported" | "already_imported" | "error";
  printful_sync_id: string;
  product?: {
    id: string;
    title: string;
    slug: string;
    price: number | null;
    image: string | null;
    category: string | null;
    printful_sync_id: string;
    description: string | null;
  };
  variantsImported?: number;
  inventoryRowsCreated?: number;
  message: string;
  durationMs: number;
  logs: string[];
};

function buildSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function parseVariantAttributes(variant: PrintfulSyncVariant): {
  color: string | null;
  size: string | null;
  attributes: Record<string, string>;
} {
  const attrs: Record<string, string> = {};
  const color: string | null = variant.color || null;
  const size: string | null = variant.size || null;

  if (color) attrs["Color"] = color;
  if (size) attrs["Size"] = size;
  if (variant.availability_status) attrs["Availability"] = variant.availability_status;

  return { color, size, attributes: attrs };
}

export async function importPrintfulProduct(
  idOrOptions?: string | number | PrintfulImportOptions
): Promise<PrintfulImportReport> {
  const options: PrintfulImportOptions =
    typeof idOrOptions === "string" || typeof idOrOptions === "number"
      ? { sync_product_id: idOrOptions, action: "import" }
      : idOrOptions ?? { action: "import" };

  const syncProductIdRaw = options.sync_product_id;
  const action = options.action ?? "import";
  const logs: string[] = [];
  const startMs = Date.now();

  const log = (msg: string) => {
    console.info(msg);
    logs.push(msg);
  };

  log(`[printful-import] ========== PRINTFUL PRODUCT IMPORT START (${action.toUpperCase()}) ==========`);

  if (!syncProductIdRaw) {
    const msg = "Printful sync_product_id is required for import.";
    log(`[printful-import] ERROR: ${msg}`);
    return {
      status: "error",
      printful_sync_id: "",
      message: msg,
      durationMs: Date.now() - startMs,
      logs,
    };
  }

  const syncProductIdStr = String(syncProductIdRaw);
  const syncProductIdNum = Number(syncProductIdRaw);

  // 1. Duplicate detection
  log("[printful-import] Checking for existing product record in database...");
  const supabase = createAdminSupabaseClient();
  let existing: any = null;

  try {
    const allProducts = await getProducts();
    existing = allProducts.find(
      (lp) =>
        String(lp.printful_sync_id) === syncProductIdStr ||
        String(lp.printful_product_id) === syncProductIdStr ||
        lp.id === `pf-sync-${syncProductIdStr}`
    );
  } catch (err) {
    log(`[printful-import] Product lookup notice: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (existing && action === "import") {
    const msg = `Product with Printful Sync ID ${syncProductIdStr} already exists in store catalog (ID: ${existing.id}, slug: ${existing.slug}).`;
    log(`[printful-import] DUPLICATE DETECTED: ${msg}`);
    return {
      status: "already_imported",
      printful_sync_id: syncProductIdStr,
      product: existing,
      message: msg,
      durationMs: Date.now() - startMs,
      logs,
    };
  }

  // 2. Fetch full Printful product details
  log(`[printful-import] Fetching Printful product details for ID ${syncProductIdStr}...`);
  let pfDetail = null;

  try {
    pfDetail = await printfulService.getSyncProduct(
      isNaN(syncProductIdNum) ? syncProductIdStr : syncProductIdNum
    );
  } catch (err) {
    const msg = `Failed to fetch Printful sync product ${syncProductIdStr}: ${err instanceof Error ? err.message : String(err)}`;
    log(`[printful-import] ERROR: ${msg}`);
    return {
      status: "error",
      printful_sync_id: syncProductIdStr,
      message: msg,
      durationMs: Date.now() - startMs,
      logs,
    };
  }

  if (!pfDetail || !pfDetail.sync_product) {
    const msg = `Printful returned empty data for product ID ${syncProductIdStr}.`;
    log(`[printful-import] ERROR: ${msg}`);
    return {
      status: "error",
      printful_sync_id: syncProductIdStr,
      message: msg,
      durationMs: Date.now() - startMs,
      logs,
    };
  }

  const syncProd = pfDetail.sync_product;
  const syncVars = pfDetail.sync_variants || [];

  log(`[printful-import] Product fetched: "${syncProd.name}" (${syncVars.length} variants)`);

  const title = syncProd.name.trim();
  const mainImage = syncProd.thumbnail_url || (syncVars[0]?.files?.[0]?.preview_url) || null;

  const images: string[] = [];
  if (mainImage) images.push(mainImage);

  for (const v of syncVars) {
    if (v.files && Array.isArray(v.files)) {
      for (const f of v.files) {
        if (f.preview_url && !images.includes(f.preview_url)) {
          images.push(f.preview_url);
        }
      }
    }
  }

  const baseCostPrice = syncVars[0]?.retail_price
    ? parseFloat(syncVars[0].retail_price)
    : 20.0;
  const pricing = calculateProductPricing(baseCostPrice, "Printful Custom");

  const mappedVariants = syncVars.map((v, i) => {
    const parsed = parseVariantAttributes(v);
    const vCost = v.retail_price ? parseFloat(v.retail_price) : baseCostPrice;
    const vPricing = calculateProductPricing(vCost, "Printful Custom");
    const delta = vPricing.sellingPrice - pricing.sellingPrice;

    return {
      id: `pf-var-${v.id}`,
      cj_variant_id: String(v.id),
      printful_variant_id: String(v.id),
      name: v.name || `${parsed.color || ""} ${parsed.size || ""}`.trim() || `Variant ${i + 1}`,
      sku: v.sku || `PF-${v.id}`,
      color: parsed.color,
      size: parsed.size,
      price: vPricing.sellingPrice,
      cost_price: vCost,
      price_delta: parseFloat(delta.toFixed(2)),
      stock: v.availability_status === "active" ? 999 : 0,
      image: v.files?.[0]?.preview_url || mainImage,
      attributes: parsed.attributes,
    };
  });

  const productId = existing && action === "update" ? existing.id : `pf-sync-${syncProd.id}`;
  const baseSlug = buildSlug(title);
  let slug = baseSlug;

  try {
    slug = await getUniqueSlug(supabase, baseSlug);
  } catch {
    slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  const productRow = {
    id: productId,
    title,
    slug: existing && action === "update" ? existing.slug : slug,
    short_description: title.slice(0, 150),
    description: `High-quality custom printed ${title}. Made to order with premium materials.`,
    category: "Apparel & Accessories",
    brand: "Printful",
    badge: "Custom Print",
    price: pricing.sellingPrice,
    compare_at_price: pricing.compareAtPrice,
    cost_price: pricing.costPrice,
    profit: pricing.profit,
    margin_percent: pricing.marginPercent,
    price_manually_overridden: false,
    image: mainImage,
    images: images.length > 0 ? images : [mainImage || "/placeholder.png"],
    variants: mappedVariants,
    sku: `PF-SYNC-${syncProd.id}`,
    inventory_quantity: 999,
    status: "published" as const,
    affiliate_link: `https://www.printful.com`,
    printful_sync_id: String(syncProd.id),
    printful_product_id: String(syncProd.product_id || syncProd.id),
    created_at: existing?.created_at || new Date().toISOString(),
  };

  log(`[printful-import] Persisting Printful product "${title}" to Supabase primary database...`);
  const savedProduct = await saveProduct(productRow as any);

  const durationMs = Date.now() - startMs;
  log(`[printful-import] ========== PRINTFUL IMPORT SUCCESS (${action.toUpperCase()}) ==========`);
  log(`[printful-import] Product ID : ${savedProduct.id}`);
  log(`[printful-import] Title      : "${title}"`);
  log(`[printful-import] Slug       : /products/${savedProduct.slug}`);
  log(`[printful-import] Variants   : ${mappedVariants.length}`);
  log(`[printful-import] Duration   : ${durationMs}ms`);

  return {
    status: "imported",
    printful_sync_id: syncProductIdStr,
    product: {
      id: savedProduct.id,
      title: savedProduct.title,
      slug: savedProduct.slug,
      price: savedProduct.price,
      image: savedProduct.image,
      category: savedProduct.category,
      printful_sync_id: syncProductIdStr,
      description: savedProduct.description,
    },
    variantsImported: mappedVariants.length,
    inventoryRowsCreated: mappedVariants.length + 1,
    message: `Successfully ${action === "update" ? "updated" : "imported"} "${title}" from Printful.`,
    durationMs,
    logs,
  };
}
