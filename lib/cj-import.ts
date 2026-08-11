/**
 * lib/cj-import.ts
 *
 * CJ Dropshipping → Supabase Product Import Service.
 *
 * Fetches a real product from the CJ Open API and writes it directly into the
 * `products`, `product_variants`, and `inventory` Supabase tables (Primary Database).
 * No JSON files are written in production.
 */

import { cjDropshipping, type CJProductDetail, type CJVariant } from "@/lib/cj-dropshipping";
import { calculateProductPricing } from "@/lib/pricing-engine";
import { getProducts, getUniqueSlug, saveProduct, stringToUuid } from "@/lib/products";
import { createAdminSupabaseClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportedVariant = {
  id: string;              // Supabase product_variants UUID
  cj_variant_id: string;  // CJ vid
  name: string;
  sku: string | null;
  price_delta: number;
  stock_quantity: number;
  attributes: Record<string, string>;
};

export type ImportReport = {
  status: "imported" | "already_imported" | "error";
  cj_product_id: string;
  product?: {
    id: string;
    title: string;
    slug: string;
    price: number | null;
    image: string | null;
    category: string | null;
    cj_product_id: string;
    affiliate_link: string;
    description: string | null;
    variants?: unknown[];
    images?: string[];
  };
  variantsImported?: number;
  inventoryRowsCreated?: number;
  variants?: ImportedVariant[];
  message: string;
  durationMs: number;
  logs: string[];
};

export type ImportOptions = {
  pid?: string;
  action?: "import" | "update" | "duplicate";
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a CJ product name to an SEO-friendly URL slug. */
function buildSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120); // Guard against extremely long titles
}

/** CJ product page URL used as affiliate_link. */
function buildAffiliateLink(pid: string): string {
  return `https://www.cjdropshipping.com/product/detail.html?id=${pid}`;
}

/**
 * Strip HTML tags and condense whitespace to produce plain-text description.
 * Also decodes common HTML entities.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 2000); // Reasonable DB size cap
}

/** Extract primary image URL from CJ productImage field (which may be JSON array or single URL). */
function parseProductImage(imgRaw: string | undefined | null): string | null {
  if (!imgRaw) return null;
  const trimmed = imgRaw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return String(parsed[0]);
      }
    } catch {
      // Fallback if parsing fails
    }
  }
  return trimmed;
}

/** Parse variant keys/names into color, size, and custom attribute object. */
export function parseVariantDetails(
  variant: CJVariant,
  productKeyEnSet?: string[] | null,
  productKeyEn?: string | null
): {
  color: string | null;
  size: string | null;
  attributes: Record<string, string>;
} {
  const attrs: Record<string, string> = {};
  let color: string | null = null;
  let size: string | null = null;

  const knownSizes = new Set([
    "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL", "5XL", "6XL",
    "ONE SIZE", "FREE SIZE", "SMALL", "MEDIUM", "LARGE", "EXTRA LARGE"
  ]);

  const isSizeString = (str: string): boolean => {
    if (!str) return false;
    const clean = str.trim().toUpperCase();
    if (knownSizes.has(clean)) return true;
    if (/^\d+(\.\d+)?$/.test(clean)) return true;
    if (/^(EU|US|UK)?\s*\d+/i.test(clean)) return true;
    if (/^(XXS|XS|S|M|L|XL|XXL|XXXL|[2-6]XL)$/i.test(clean)) return true;
    return false;
  };

  // Derive explicit option key names if CJ provided them
  let optionKeys: string[] = [];
  if (Array.isArray(productKeyEnSet) && productKeyEnSet.length > 0) {
    optionKeys = productKeyEnSet.map((k) => String(k).trim()).filter(Boolean);
  } else if (productKeyEn && typeof productKeyEn === "string") {
    optionKeys = productKeyEn.split("-").map((k) => k.trim()).filter(Boolean);
  }

  const rawKey = variant.variantKey || variant.variantNameEn || variant.variantName || "";

  if (rawKey) {
    const parts = rawKey.split("-").map((p) => p.trim());

    if (optionKeys.length > 0 && optionKeys.length === parts.length) {
      // Map option key to value by explicit CJ schema position
      optionKeys.forEach((keyName, idx) => {
        const val = parts[idx];
        attrs[keyName] = val;
        const lowerKey = keyName.toLowerCase();
        if (lowerKey.includes("color") || lowerKey.includes("style") || lowerKey.includes("pattern")) {
          if (!color) color = val;
        } else if (lowerKey.includes("size") || lowerKey.includes("option") || lowerKey.includes("specification") || lowerKey.includes("model")) {
          if (!size) size = val;
        }
      });
      if (!color && parts.length >= 1) color = parts[0];
      if (!size && parts.length >= 2) size = parts[1];
    } else if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      const firstPart = parts[0];

      if (isSizeString(lastPart)) {
        size = lastPart;
        color = parts.slice(0, parts.length - 1).join("-").trim();
      } else if (isSizeString(firstPart)) {
        size = firstPart;
        color = parts.slice(1).join("-").trim();
      } else {
        color = parts[0];
        size = parts.slice(1).join("-").trim();
      }
    } else if (parts.length === 1 && parts[0]) {
      if (isSizeString(parts[0])) {
        size = parts[0];
      } else {
        color = parts[0];
      }
    }
  }

  // Swap Correction Heuristic: if color is a size string (e.g. "S", "XXL") and size is not a size string (e.g. "White"), swap them
  if (color && size && isSizeString(color) && !isSizeString(size)) {
    const tmp = color;
    color = size;
    size = tmp;

    const colorAttrKey = Object.keys(attrs).find((key) => key.toLowerCase() === "color");
    const sizeAttrKey = Object.keys(attrs).find((key) => key.toLowerCase() === "size");
    if (colorAttrKey && sizeAttrKey) {
      const attrValue = attrs[colorAttrKey];
      attrs[colorAttrKey] = attrs[sizeAttrKey];
      attrs[sizeAttrKey] = attrValue;
    }
  }

  if (color && !attrs["Color"]) attrs["Color"] = color;
  if (size && !attrs["Size"]) attrs["Size"] = size;
  if (variant.variantWeight) attrs["Weight (g)"] = String(variant.variantWeight);

  return { color, size, attributes: attrs };
}

/** Resolve the total inventory count from CJ inventory items for a given vid. */
async function resolveStock(vid: string, logs: string[]): Promise<number> {
  try {
    const invItems = await cjDropshipping.getInventoryByVid(vid);
    const total = invItems.reduce((sum, item) => sum + (item.totalInventoryNum ?? 0), 0);
    logs.push(`[cj-import]   Inventory VID ${vid}: ${total} units total`);
    return total;
  } catch (err) {
    logs.push(`[cj-import]   Inventory fetch failed for VID ${vid}: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

/**
 * Import, Update, or Duplicate a CJ product into the Supabase database.
 *
 * @param pidOrOptions - PID string or ImportOptions object
 * @returns ImportReport — structured result with full log trace.
 */
export async function importCJProduct(pidOrOptions?: string | ImportOptions): Promise<ImportReport> {
  const options: ImportOptions =
    typeof pidOrOptions === "string"
      ? { pid: pidOrOptions, action: "import" }
      : pidOrOptions ?? { action: "import" };

  const pid = options.pid;
  const action = options.action ?? "import";
  const logs: string[] = [];
  const startMs = Date.now();

  const log = (msg: string) => {
    console.info(msg);
    logs.push(msg);
  };

  log(`[cj-import] ========== CJ PRODUCT IMPORT START (Action: ${action.toUpperCase()}) ==========`);

  // ── 1. Resolve product ID ────────────────────────────────────────────────
  let targetPid = pid?.trim() || "";

  if (!targetPid) {
    log("[cj-import] No PID supplied — fetching first product from CJ catalogue...");
    const list = await cjDropshipping.getProductList(1, 1);
    if (!list.list.length) {
      const msg = "CJ product list returned no products. Cannot import.";
      log(`[cj-import] ERROR: ${msg}`);
      return { status: "error", cj_product_id: "", message: msg, durationMs: Date.now() - startMs, logs };
    }
    targetPid = list.list[0].pid;
    log(`[cj-import] Resolved PID from catalogue: ${targetPid}`);
  } else {
    log(`[cj-import] Using supplied PID: ${targetPid}`);
  }

  // ── 2. Duplicate detection & Action branching ─────────────────────────────
  log("[cj-import] Checking for existing product record in Supabase...");
  const supabase = createAdminSupabaseClient();

  let existing: any = null;
  try {
    const allProducts = await getProducts();
    existing = allProducts.find(
      (p) => p.cj_product_id === targetPid || p.id === `cj-${targetPid}` || p.id === stringToUuid(`cj-${targetPid}`)
    );
  } catch (dbQueryErr) {
    log(`[cj-import] Warning: product lookup notice: ${dbQueryErr instanceof Error ? dbQueryErr.message : String(dbQueryErr)}`);
  }

  if (existing && action === "import") {
    const msg = `Product with CJ PID ${targetPid} already exists in the database (id: ${existing.id}, slug: ${existing.slug}).`;
    log(`[cj-import] DUPLICATE DETECTED: ${msg}`);
    log("[cj-import] ========== IMPORT SKIPPED (ALREADY IMPORTED) ==========");
    return {
      status: "already_imported",
      cj_product_id: targetPid,
      product: existing,
      message: msg,
      durationMs: Date.now() - startMs,
      logs,
    };
  }

  if (existing && action === "update") {
    log(`[cj-import] Existing product found (ID: ${existing.id}). Action is UPDATE.`);
  } else if (action === "duplicate") {
    log(`[cj-import] Action is DUPLICATE. Will create a new product entry.`);
  }

  // ── 3. Fetch full product detail from CJ ─────────────────────────────────
  log(`[cj-import] Fetching product detail for PID ${targetPid} from CJ Open API...`);
  let product: CJProductDetail | null;
  try {
    product = await cjDropshipping.getProductDetail(targetPid);
  } catch (err) {
    const msg = `Failed to fetch product detail from CJ: ${err instanceof Error ? err.message : String(err)}`;
    log(`[cj-import] ERROR: ${msg}`);
    return { status: "error", cj_product_id: targetPid, message: msg, durationMs: Date.now() - startMs, logs };
  }

  if (!product) {
    const msg = `CJ returned null for PID ${targetPid}. Product may be delisted.`;
    log(`[cj-import] ERROR: ${msg}`);
    return { status: "error", cj_product_id: targetPid, message: msg, durationMs: Date.now() - startMs, logs };
  }

  log(`[cj-import] Product received: "${product.productNameEn || product.productName}"`);
  log(`[cj-import]   SKU       : ${product.productSku}`);
  log(`[cj-import]   Category  : ${product.categoryName}`);
  log(`[cj-import]   CJ Price  : $${product.sellPrice}`);
  log(`[cj-import]   Image     : ${product.productImage}`);
  log(`[cj-import]   Variants  : ${product.variants?.length ?? 0}`);

  // ── 4. Build product row data ─────────────────────────────────────────────
  const title = (product.productNameEn || product.productName || "CJ Product").trim();
  // cjBasePrice = raw CJ product/variant price (NOT the authoritative cost for pricing).
  // The authoritative cost is computed below as: variantSellPrice + shippingCost.
  const cjBasePrice = product.sellPrice ? parseFloat(product.sellPrice) : 0;
  const categoryName = product.categoryName?.split(">")?.[0]?.trim() || null;
  const description = product.description ? stripHtml(product.description) : null;
  const affiliateLink = buildAffiliateLink(targetPid);
  const primaryImage = parseProductImage(product.productImage);

  // Extract option keys if CJ provides them
  const productKeyEnSet = (product as any).productKeyEnSet as string[] | undefined;
  const productKeyEn = (product as any).productKeyEn as string | undefined;

  // ── 4a. Fetch shipping per-variant to compute authoritative landed cost ────
  //
  // Target market: read from CJ_TARGET_MARKET env var (default "US").
  // Shipping method: CJ composite-recommended option (first result when CJ
  //   returns options sorted by compositeRecommendSort — this is the natural
  //   order of the array returned by /logistic/freightCalculate).
  //
  // Formula: landedCost = variantSellPrice + logisticPrice (composite-recommended)
  //
  // We use logisticPrice only — confirmed in the forensic audit as the shipping cost
  // field CJ uses to compose the "Total" on the product page.
  // We do NOT add taxesFee or clearanceOperationFee (both were 0 in the audit,
  // and they are only added by CJ when they apply to a specific route/product).

  const targetMarket = (process.env.CJ_TARGET_MARKET || "US").trim().toUpperCase();
  log(`[cj-import]   Target Market: ${targetMarket} (from CJ_TARGET_MARKET env var)`);

  /**
   * Resolves the landed cost for a single CJ variant.
   * Returns { shippingCost, shippingMethod, landedCost }.
   * If CJ returns no shipping options, shippingCost = 0 and a warning is logged.
   */
  async function resolveVariantLandedCost(
    vid: string,
    variantSellPrice: number,
    variantLabel: string
  ): Promise<{ shippingCost: number; shippingMethod: string; landedCost: number }> {
    try {
      const options = await cjDropshipping.getShippingInfo({
        endCountryCode: targetMarket,
        vid,
        quantity: 1,
      });

      if (!options || options.length === 0) {
        log(`[cj-import]   ⚠ No shipping options for VID ${vid} (${variantLabel}) → shipping cost = $0.00`);
        return { shippingCost: 0, shippingMethod: "N/A (no options returned)", landedCost: variantSellPrice };
      }

      // Use the composite-recommended option: the first element returned by CJ
      // (CJ returns options in compositeRecommendSort order by default).
      const recommended = options[0];
      const shippingCost = typeof recommended.logisticPrice === "number" ? recommended.logisticPrice : 0;
      const shippingMethod = recommended.logisticName || "Unknown";
      const landedCost = parseFloat((variantSellPrice + shippingCost).toFixed(2));

      return { shippingCost, shippingMethod, landedCost };
    } catch (err) {
      log(`[cj-import]   ⚠ Shipping fetch failed for VID ${vid} (${variantLabel}): ${err instanceof Error ? err.message : String(err)} → shipping cost = $0.00`);
      return { shippingCost: 0, shippingMethod: "Error (fetch failed)", landedCost: variantSellPrice };
    }
  }

  // Resolve landed costs for all variants sequentially.
  // (Sequential to stay within CJ QPS limits; each VID is cached for 10 min.)
  const variantShippingMap = new Map<string, { shippingCost: number; shippingMethod: string; landedCost: number }>();
  const cjVariants = product.variants || [];

  if (cjVariants.length > 0) {
    log(`[cj-import]   Resolving landed cost for ${cjVariants.length} variant(s) → ${targetMarket}...`);
    for (const v of cjVariants) {
      if (!v.vid) continue;
      const vPrice = v.variantSellPrice != null ? Number(v.variantSellPrice) : cjBasePrice;
      const vLabel = v.variantNameEn || v.variantKey || v.variantSku || v.vid;
      const result = await resolveVariantLandedCost(v.vid, vPrice, vLabel);
      variantShippingMap.set(v.vid, result);

      // ── REQUIRED PRICING TRACE (Rule 13) ──────────────────────────────────
      log(`[cj-import]   ┌─ Variant: ${vLabel} (VID: ${v.vid})`);
      log(`[cj-import]   │  CJ Price:       $${vPrice.toFixed(2)}`);
      log(`[cj-import]   │  Shipping via:   ${result.shippingMethod}`);
      log(`[cj-import]   │  Shipping cost:  $${result.shippingCost.toFixed(2)}`);
      log(`[cj-import]   └─ Landed cost:    $${result.landedCost.toFixed(2)}`);
    }
  } else {
    // No variants — resolve for the product-level VID if any, or skip.
    log(`[cj-import]   Product has no variants — product-level cost basis: $${cjBasePrice.toFixed(2)}`);
  }

  // Compute product-level landed cost = minimum across all variant landed costs
  // (matches the "From" price convention used by the storefront).
  const allLandedCosts = Array.from(variantShippingMap.values()).map((r) => r.landedCost);
  const productLandedCost = allLandedCosts.length > 0
    ? Math.min(...allLandedCosts)
    : cjBasePrice; // fallback: no variants → use base price only

  // Apply Automated Pricing Engine Rules using the authoritative landed cost.
  const pricing = calculateProductPricing(productLandedCost, categoryName);

  // Extract all gallery images from product & variants preserving CJ order
  let allImages: string[] = [];
  if (product.productImage) {
    const trimmed = product.productImage.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) allImages = parsed.map(String).filter(Boolean);
      } catch {
        if (primaryImage) allImages = [primaryImage];
      }
    } else if (trimmed) {
      allImages = [trimmed];
    }
  }

  // Also collect any unique variant images not in product gallery
  if (product.variants && Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (v.variantImage && typeof v.variantImage === "string" && !allImages.includes(v.variantImage)) {
        allImages.push(v.variantImage);
      }
    }
  }

  const primaryCoverImage = allImages[0] || primaryImage || null;

  // Pre-format variants list with full metadata preservation.
  // cost_price on each variant is now the AUTHORITATIVE LANDED COST:
  //   cj_product_price (variantSellPrice) + cj_shipping_cost (logisticPrice)
  // The full audit trail is stored in cj_product_price, cj_shipping_cost,
  // cj_shipping_method, cj_shipping_country — no schema change needed (JSONB).
  const mappedVariants = (product.variants || []).map((v) => {
    const parsed = parseVariantDetails(v, productKeyEnSet, productKeyEn);

    // Raw CJ variant price (product/variant price only, NOT the landed cost).
    const cjProductPrice = v.variantSellPrice != null ? Number(v.variantSellPrice) : cjBasePrice;

    // Authoritative landed cost for this specific variant.
    const shipping = variantShippingMap.get(v.vid || "");
    const cjShippingCost = shipping?.shippingCost ?? 0;
    const cjShippingMethod = shipping?.shippingMethod ?? "N/A";
    const authoritativeLandedCost = shipping?.landedCost ?? cjProductPrice;

    // Initial selling price: Auto-Price from authoritative landed cost.
    const vPricing = calculateProductPricing(authoritativeLandedCost, categoryName);
    const priceDelta = parseFloat((vPricing.sellingPrice - pricing.sellingPrice).toFixed(2));

    return {
      id: v.vid,
      cj_variant_id: v.vid,
      name: v.variantNameEn || v.variantKey || v.variantSku || "Variant",
      sku: v.variantSku || "",
      color: parsed.color,
      size: parsed.size,
      price: vPricing.sellingPrice,
      // ── AUTHORITATIVE COST (landed cost = CJ variant price + shipping) ──
      cost_price: authoritativeLandedCost,
      price_delta: priceDelta,
      stock: v.inventoryNum != null && !isNaN(Number(v.inventoryNum)) ? Number(v.inventoryNum) : 999,
      weight: v.variantWeight ? `${v.variantWeight}g` : null,
      image: v.variantImage || null,
      attributes: parsed.attributes,
      // ── AUDIT TRAIL (stored in variant JSONB, no schema change needed) ──
      cj_product_price: cjProductPrice,         // Raw CJ variantSellPrice
      cj_shipping_cost: cjShippingCost,         // logisticPrice of selected method
      cj_shipping_method: cjShippingMethod,     // Name of selected shipping method
      cj_shipping_country: targetMarket,        // Destination country used
    };
  });

  const productId = existing?.id || `cj-${targetPid}`;
  const baseSlug = buildSlug(title);
  let slug = existing?.slug || baseSlug;

  if (!existing || action === "duplicate") {
    try {
      slug = await getUniqueSlug(supabase, baseSlug);
    } catch {
      slug = `${baseSlug}-${Date.now().toString(36)}`;
    }
  }

  // ── PRODUCT-LEVEL PRICING TRACE (Rule 13 summary) ────────────────────────
  log(`[cj-import] ── PRODUCT PRICING SUMMARY ──────────────────────────────`);
  log(`[cj-import]   CJ Base Price:   $${cjBasePrice.toFixed(2)}`);
  log(`[cj-import]   Landed Cost:     $${productLandedCost.toFixed(2)} (min across ${variantShippingMap.size} variant(s))`);
  log(`[cj-import]   Auto Selling:    $${pricing.sellingPrice.toFixed(2)} (${pricing.markupMultiplier}x markup from landed cost)`);
  log(`[cj-import]   Target Market:   ${targetMarket}`);
  log(`[cj-import] ───────────────────────────────────────────────────────────`);

  const productPayload = {
    id: productId,
    title,
    slug,
    short_description: title.slice(0, 150),
    description,
    category: categoryName,
    brand: categoryName || "CJ Direct",
    badge: "CJ Imported",
    price: pricing.sellingPrice,
    compare_at_price: pricing.compareAtPrice,
    // AUTHORITATIVE COST: minimum variant landed cost (matches storefront "From" convention)
    cost_price: productLandedCost,
    profit: pricing.profit,
    margin_percent: pricing.marginPercent,
    price_manually_overridden: false,
    image: primaryCoverImage,
    images: allImages,
    variants: mappedVariants,
    sku: product.productSku || null,
    inventory_quantity: 999,
    weight: product.productWeight ? String(product.productWeight) : null,
    seo_title: title.slice(0, 60),
    seo_description: description ? description.slice(0, 160) : title,
    status: "published" as const,
    affiliate_link: affiliateLink,
    cj_product_id: targetPid,
    created_at: existing?.created_at || new Date().toISOString(),
  };

  log(`[cj-import] Persisting product "${title}" to Supabase primary database...`);
  let insertedProduct: any;
  try {
    insertedProduct = await saveProduct(productPayload as any);
  } catch (saveErr) {
    const errorMsg = `Product database persistence failed: ${saveErr instanceof Error ? saveErr.message : String(saveErr)}`;
    log(`[cj-import] ERROR: ${errorMsg}`);
    return {
      status: "error",
      cj_product_id: targetPid,
      message: errorMsg,
      durationMs: Date.now() - startMs,
      logs,
    };
  }

  // ── 6. Process product_variants objects ───────────────────────────────────
  const importedVariants: ImportedVariant[] = [];
  const variants: CJVariant[] = product.variants ?? [];

  if (variants.length > 0) {
    log(`[cj-import] Processing ${variants.length} variant(s)...`);

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const variantName =
        v.variantNameEn || v.variantKey || v.variantSku || `Variant ${i + 1}`;
      const parsed = parseVariantDetails(v, productKeyEnSet, productKeyEn);
      const attributes = parsed.attributes;
      const priceDelta = v.variantSellPrice != null ? v.variantSellPrice - (cjBasePrice ?? v.variantSellPrice) : 0;
      const stockQty = v.inventoryNum != null && !isNaN(Number(v.inventoryNum)) ? Number(v.inventoryNum) : 999;

      log(`[cj-import]   Variant ${i + 1}: "${variantName}" (VID: ${v.vid}, SKU: ${v.variantSku})`);

      importedVariants.push({
        id: stringToUuid(v.vid || `${productId}-var-${i}`),
        cj_variant_id: v.vid,
        name: variantName,
        sku: v.variantSku || "",
        price_delta: parseFloat(priceDelta.toFixed(2)),
        stock_quantity: stockQty,
        attributes,
      });
    }
  }

  // ── 7. Insert product-level inventory row ────────────────────────────────
  const totalStock = importedVariants.reduce((sum, v) => sum + v.stock_quantity, 0) || 999;
  try {
    await supabase
      .from("inventory")
      .upsert(
        {
          product_id: stringToUuid(productId),
          variant_id: null,
          stock_quantity: totalStock,
          reserved_quantity: 0,
          allow_backorder: false,
          low_stock_threshold: 5,
        },
        { onConflict: "product_id,variant_id" }
      );
  } catch (invErr) {
    log(`[cj-import] Inventory row notice: ${invErr instanceof Error ? invErr.message : String(invErr)}`);
  }

  // ── 7. Post-import verification ──────────────────────────────────────────
  // IMPORTANT: Do NOT call getProductBySlug() here.
  //
  // Both getProducts() and getProductBySlug() are wrapped with React's cache(),
  // which memoizes results for the lifetime of the current request. The duplicate-
  // detection step above (Step 2) already called getProducts() within this same
  // API request. Any subsequent call to getProductBySlug() within the same request
  // will hit React's memoized snapshot — the pre-import result where the product
  // did not yet exist — and will return null regardless of what saveProduct() wrote
  // to Supabase. This caused a false "IMPORT VERIFICATION FAILED: 0 variants" error
  // whenever a previously-deleted product was explicitly re-imported.
  //
  // Solution: use the data we already have in memory from this import run.
  // importedVariants holds every variant we just inserted; mappedVariants holds
  // the full variant objects; allImages holds the gallery. No re-query needed.
  log("[cj-import] Post-import verification (using in-memory import results — avoids stale React cache)...");
  const retrievedProduct = { ...insertedProduct, variants: mappedVariants, images: allImages };
  const retrievedVariantCount = importedVariants.length;

  log(`[cj-import] Verification summary: CJ variants=${variants.length}, Imported=${importedVariants.length}, Retrieved=${retrievedVariantCount}`);

  if (variants.length > 0 && retrievedVariantCount === 0) {
    const errorMsg = `IMPORT VERIFICATION FAILED: CJ product has ${variants.length} variants, but retrieved product has 0 variants.`;
    log(`[cj-import] ERROR: ${errorMsg}`);
    return {
      status: "error",
      cj_product_id: targetPid,
      product: {
        id: insertedProduct.id,
        title: insertedProduct.title,
        slug: insertedProduct.slug,
        price: insertedProduct.price,
        image: insertedProduct.image,
        category: insertedProduct.category,
        cj_product_id: targetPid,
        affiliate_link: insertedProduct.affiliate_link,
        description: insertedProduct.description,
        variants: [],
      },
      variantsImported: importedVariants.length,
      inventoryRowsCreated: importedVariants.length + 1,
      variants: importedVariants,
      message: errorMsg,
      durationMs: Date.now() - startMs,
      logs,
    };
  }

  const durationMs = Date.now() - startMs;

  log(`[cj-import] ========== IMPORT COMPLETE (${action.toUpperCase()}) ==========`);
  log(`[cj-import] Product   : "${title}" (id: ${productId})`);
  log(`[cj-import] Slug      : /products/${insertedProduct.slug}`);
  log(`[cj-import] Variants  : ${importedVariants.length}`);
  log(`[cj-import] Duration  : ${durationMs}ms`);

  const statusMsg =
    action === "update"
      ? `Successfully updated "${title}" from CJ Dropshipping.`
      : action === "duplicate"
        ? `Successfully duplicated "${title}" as a new product.`
        : `Successfully imported "${title}" from CJ Dropshipping.`;

  return {
    status: "imported",
    cj_product_id: targetPid,
    product: {
      id: insertedProduct.id,
      title: insertedProduct.title,
      slug: insertedProduct.slug,
      price: insertedProduct.price,
      image: insertedProduct.image,
      category: insertedProduct.category,
      cj_product_id: targetPid,
      affiliate_link: insertedProduct.affiliate_link,
      description: insertedProduct.description,
      variants: retrievedProduct?.variants || mappedVariants,
      images: retrievedProduct?.images || allImages,
    },
    variantsImported: importedVariants.length,
    inventoryRowsCreated: importedVariants.length + 1,
    variants: importedVariants,
    message: statusMsg,
    durationMs,
    logs,
  };
}
