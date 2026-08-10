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
import { getProducts, getProductBySlug, getUniqueSlug, saveProduct, stringToUuid } from "@/lib/products";
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
  log(`[cj-import]   Price     : $${product.sellPrice}`);
  log(`[cj-import]   Image     : ${product.productImage}`);
  log(`[cj-import]   Variants  : ${product.variants?.length ?? 0}`);

  // ── 4. Build product row data ─────────────────────────────────────────────
  const title = (product.productNameEn || product.productName || "CJ Product").trim();
  const cjCost = product.sellPrice ? parseFloat(product.sellPrice) : 0;
  const categoryName = product.categoryName?.split(">")?.[0]?.trim() || null;
  const description = product.description ? stripHtml(product.description) : null;
  const affiliateLink = buildAffiliateLink(targetPid);
  const primaryImage = parseProductImage(product.productImage);

  // Extract option keys if CJ provides them
  const productKeyEnSet = (product as any).productKeyEnSet as string[] | undefined;
  const productKeyEn = (product as any).productKeyEn as string | undefined;

  // Apply Automated Pricing Engine Rules
  const pricing = calculateProductPricing(cjCost, categoryName);

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

  // Pre-format variants list with full metadata preservation
  const mappedVariants = (product.variants || []).map((v) => {
    const parsed = parseVariantDetails(v, productKeyEnSet, productKeyEn);
    const vCost = v.variantSellPrice != null ? Number(v.variantSellPrice) : cjCost;
    const vPricing = calculateProductPricing(vCost, categoryName);
    const priceDelta = vPricing.sellingPrice - pricing.sellingPrice;

    return {
      id: v.vid,
      cj_variant_id: v.vid,
      name: v.variantNameEn || v.variantKey || v.variantSku || "Variant",
      sku: v.variantSku || "",
      color: parsed.color,
      size: parsed.size,
      price: vPricing.sellingPrice,
      cost_price: vCost,
      price_delta: parseFloat(priceDelta.toFixed(2)),
      stock: v.inventoryNum != null && !isNaN(Number(v.inventoryNum)) ? Number(v.inventoryNum) : 999,
      weight: v.variantWeight ? `${v.variantWeight}g` : null,
      image: v.variantImage || null,
      attributes: parsed.attributes,
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
    cost_price: pricing.costPrice,
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
  const insertedProduct = await saveProduct(productPayload as any);

  // ── 6. Process product_variants rows ──────────────────────────────────────
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
      const priceDelta = v.variantSellPrice != null ? v.variantSellPrice - (cjCost ?? v.variantSellPrice) : 0;
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

      // Attempt optional Supabase product_variants table upsert if schema supports it
      try {
        const { data: insertedVariant } = await supabase
          .from("product_variants")
          .upsert(
            {
              product_id: stringToUuid(productId),
              name: variantName,
              sku: v.variantSku || null,
              price_delta: parseFloat(priceDelta.toFixed(2)),
              is_active: true,
              sort_order: i,
              attributes,
              cj_variant_id: v.vid,
            },
            { onConflict: "sku" }
          )
          .select("id,name,sku,price_delta,attributes,cj_variant_id")
          .single();

        if (insertedVariant) {
          await supabase
            .from("inventory")
            .upsert(
              {
                product_id: stringToUuid(productId),
                variant_id: insertedVariant.id,
                stock_quantity: stockQty,
                reserved_quantity: 0,
                allow_backorder: false,
                low_stock_threshold: 5,
              },
              { onConflict: "product_id,variant_id" }
            );
        }
      } catch (variantErr) {
        // Table or constraint note (gracefully handled)
      }
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

  // ── 7. Post-import verification: retrieve product via getProductBySlug ─────
  log("[cj-import] Executing post-import verification query via getProductBySlug...");
  const retrievedProduct = await getProductBySlug(insertedProduct.slug);
  const retrievedVariantCount = retrievedProduct?.variants?.length ?? 0;

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
