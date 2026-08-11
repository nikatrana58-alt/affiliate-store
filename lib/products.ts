import fs from "fs";
import path from "path";
import crypto from "crypto";
import { cache } from "react";
import { createPublicSupabaseClient, createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { calculateProfitMetrics } from "@/lib/pricing-engine";

export type ProductVariantItem = {
  id?: string;
  cj_variant_id?: string;
  printful_variant_id?: string | number | null;
  name: string;
  sku?: string;
  color?: string | null;
  size?: string | null;
  price?: number;
  cost_price?: number;
  price_delta: number;
  stock: number;
  weight?: string | null;
  image?: string | null;
  attributes?: Record<string, string>;
};

export type Product = {
  id: string;
  title: string;
  slug: string;
  short_description?: string | null;
  description: string | null;
  category: string | null;
  collections?: string[] | null;
  tags?: string[] | null;
  brand?: string | null;
  badge: string | null;
  price: number | null;
  compare_at_price?: number | null;
  cost_price?: number | null;
  profit?: number | null;
  margin_percent?: number | null;
  price_manually_overridden?: boolean | null;
  image: string | null;
  images?: string[] | null;
  variants?: ProductVariantItem[] | null;
  sku?: string | null;
  inventory_quantity?: number | null;
  weight?: string | null;
  dimensions?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  status?: "draft" | "published" | "hidden";
  affiliate_link: string;
  cj_product_id?: string | null;
  printful_product_id?: string | number | null;
  printful_sync_id?: string | number | null;
  is_original?: boolean | null;
  supplier_type?: "CJ" | "PRINTFUL" | "PRINTIFY" | "AMAZON" | "MANUAL" | null;
  created_at: string;
};

export type ProductInput = Omit<Product, "id" | "created_at">;

export const PRODUCT_COLUMNS = "*";

export function stringToUuid(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash("sha256").update(id).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function isJsonFallbackEnabled(): boolean {
  return process.env.ENABLE_JSON_FALLBACK === "true";
}

export const FALLBACK_PRODUCTS: Product[] = [
  // ── LUXURY COLLECTION ──
  {
    id: "luxury-1",
    title: "RA2Z Obsidian & Gold Chronograph Watch",
    slug: "ra2z-obsidian-gold-chronograph-watch",
    description: "Handcrafted precision chronograph featuring a sapphire crystal face, Swiss movement, and obsidian leather strap.",
    category: "Luxury",
    collections: ["luxury"],
    badge: "Editor's Choice",
    price: 695.0,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://ra2z.shop/products/ra2z-obsidian-gold-chronograph-watch",
    created_at: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "luxury-2",
    title: "RA2Z Executive Leather Travel Duffel",
    slug: "ra2z-executive-leather-travel-duffel",
    description: "Full-grain Italian Nappa leather travel bag with hand-burnished champagne gold hardware.",
    category: "Luxury",
    collections: ["luxury"],
    badge: "Luxury Edition",
    price: 850.0,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://ra2z.shop/products/ra2z-executive-leather-travel-duffel",
    created_at: "2026-01-14T10:00:00.000Z",
  },
  {
    id: "luxury-3",
    title: "Minimalist Dual-Boiler Espresso Machine",
    slug: "minimalist-espresso-machine",
    description: "Italian designed dual-boiler espresso machine crafted from brushed titanium and matte black metal.",
    category: "Luxury",
    collections: ["luxury"],
    badge: "Trending",
    price: 1290.0,
    image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://ra2z.shop/products/minimalist-espresso-machine",
    created_at: "2026-01-13T10:00:00.000Z",
  },
  {
    id: "luxury-4",
    title: "RA2Z Titanium & Gold Bifold Wallet",
    slug: "ra2z-titanium-gold-bifold-wallet",
    description: "RFID-blocking aerospace titanium cardholder wrapped in hand-stitched Tuscan leather.",
    category: "Luxury",
    collections: ["luxury"],
    badge: "Best Seller",
    price: 280.0,
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://ra2z.shop/products/ra2z-titanium-gold-bifold-wallet",
    created_at: "2026-01-12T10:00:00.000Z",
  },

  // ── RA2Z ORIGINALS COLLECTION ──
  {
    id: "original-1",
    title: "RA2Z Signature Heavyweight Gold Hoodie",
    slug: "ra2z-signature-heavyweight-gold-hoodie",
    description: "450 GSM organic French terry cotton hoodie featuring 3D puff embroidery with raw metallic gold accents.",
    category: "Apparel",
    collections: ["originals"],
    badge: "RA2Z Original",
    price: 145.0,
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://ra2z.shop/products/ra2z-signature-heavyweight-gold-hoodie",
    created_at: "2026-01-11T10:00:00.000Z",
    is_original: true,
  },
  {
    id: "original-2",
    title: "RA2Z Monogram Stainless Tumbler (750ml)",
    slug: "ra2z-monogram-stainless-tumbler-750ml",
    description: "Double-wall vacuum insulated stainless steel water flask with signature laser-engraved RA2Z monogram.",
    category: "Accessories",
    collections: ["originals"],
    badge: "RA2Z Original",
    price: 65.0,
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://ra2z.shop/products/ra2z-monogram-stainless-tumbler-750ml",
    created_at: "2026-01-10T10:00:00.000Z",
    is_original: true,
  },
  {
    id: "original-3",
    title: "RA2Z Minimalist Matte Black Cap",
    slug: "ra2z-minimalist-matte-black-cap",
    description: "Structured 6-panel dad hat featuring waterproof matte nylon fabric and an embossed 3D metal RA2Z emblem.",
    category: "Accessories",
    collections: ["originals"],
    badge: "RA2Z Original",
    price: 55.0,
    image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://ra2z.shop/products/ra2z-minimalist-matte-black-cap",
    created_at: "2026-01-09T10:00:00.000Z",
    is_original: true,
  },
  {
    id: "original-4",
    title: "RA2Z Executive Leather Desk Mat",
    slug: "ra2z-executive-leather-desk-mat",
    description: "Ultra-smooth waterproof vegan leather desk pad with micro-stitched gold borders and anti-slip backing.",
    category: "Accessories",
    collections: ["originals"],
    badge: "RA2Z Original",
    price: 85.0,
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://ra2z.shop/products/ra2z-executive-leather-desk-mat",
    created_at: "2026-01-08T10:00:00.000Z",
    is_original: true,
  },
];

const LOCAL_PRODUCTS_FILE = path.join(process.cwd(), "data", "products.json");
const DELETED_PRODUCTS_FILE = path.join(process.cwd(), "data", "deleted-products.json");

function ensureDataDirExists() {
  const dir = path.dirname(LOCAL_PRODUCTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Deleted-Products Manifest
// Stores stable identifiers for every permanently deleted product so that NO
// local-JSON fallback or merge path can resurrect them.
// ─────────────────────────────────────────────────────────────────────────────

type DeletedProductEntry = {
  id: string;           // original product id (e.g. "cj-XXXXXX")
  slug?: string;        // product slug at time of deletion
  cj_product_id?: string; // CJ PID if applicable
  deleted_at: string;   // ISO timestamp
};

/** All stable identifiers for a deleted product (id, slug, cjPid, derived uuid). */
function buildDeletedSet(entry: DeletedProductEntry): Set<string> {
  const s = new Set<string>();
  s.add(entry.id);
  s.add(stringToUuid(entry.id));
  if (entry.slug) s.add(entry.slug);
  if (entry.cj_product_id) {
    s.add(entry.cj_product_id);
    s.add(`cj-${entry.cj_product_id}`);
    s.add(stringToUuid(`cj-${entry.cj_product_id}`));
  }
  return s;
}

/** Read the deleted-products manifest and return a Set of ALL known identifiers. */
export function getDeletedProductIds(): Set<string> {
  try {
    ensureDataDirExists();
    if (fs.existsSync(DELETED_PRODUCTS_FILE)) {
      const content = fs.readFileSync(DELETED_PRODUCTS_FILE, "utf-8");
      const entries: DeletedProductEntry[] = JSON.parse(content);
      if (Array.isArray(entries)) {
        const result = new Set<string>();
        for (const entry of entries) {
          for (const token of buildDeletedSet(entry)) result.add(token);
        }
        return result;
      }
    }
  } catch {
    // If the manifest is missing or corrupt, return empty set — safe default
  }
  return new Set<string>();
}

/** Return true if ANY of this product's stable identifiers appear in the deleted manifest. */
function isProductDeleted(deletedIds: Set<string>, p: Product): boolean {
  if (deletedIds.size === 0) return false;
  if (deletedIds.has(p.id)) return true;
  if (deletedIds.has(stringToUuid(p.id))) return true;
  if (p.slug && deletedIds.has(p.slug)) return true;
  if (p.cj_product_id) {
    if (deletedIds.has(p.cj_product_id)) return true;
    if (deletedIds.has(`cj-${p.cj_product_id}`)) return true;
    if (deletedIds.has(stringToUuid(`cj-${p.cj_product_id}`))) return true;
  }
  return false;
}

/** Add a product's stable identifiers to the deleted-products manifest. */
export function addToDeletedManifest(id: string, slug?: string | null, cjProductId?: string | null): void {
  try {
    ensureDataDirExists();
    let entries: DeletedProductEntry[] = [];
    if (fs.existsSync(DELETED_PRODUCTS_FILE)) {
      try {
        const content = fs.readFileSync(DELETED_PRODUCTS_FILE, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) entries = parsed;
      } catch {
        entries = [];
      }
    }
    // Avoid duplicates
    const alreadyPresent = entries.some((e) => e.id === id);
    if (!alreadyPresent) {
      const entry: DeletedProductEntry = { id, deleted_at: new Date().toISOString() };
      if (slug) entry.slug = slug;
      if (cjProductId) entry.cj_product_id = cjProductId;
      entries.unshift(entry);
    }
    fs.writeFileSync(DELETED_PRODUCTS_FILE, JSON.stringify(entries, null, 2), "utf-8");
  } catch (err) {
    console.warn("[products] Failed to write deleted-products manifest:", err);
  }
}

/**
 * Remove a product's identifiers from the deleted-products manifest.
 * Called when an admin explicitly re-imports the same product, intentionally
 * creating it fresh. This clears the deletion marker so the product can
 * appear in the catalog again.
 */
export function removeFromDeletedManifest(id: string, slug?: string | null, cjProductId?: string | null): void {
  try {
    if (!fs.existsSync(DELETED_PRODUCTS_FILE)) return;
    const content = fs.readFileSync(DELETED_PRODUCTS_FILE, "utf-8");
    let entries: DeletedProductEntry[] = JSON.parse(content);
    if (!Array.isArray(entries)) return;

    const tokensToRemove = buildDeletedSet({ id, slug: slug ?? undefined, cj_product_id: cjProductId ?? undefined, deleted_at: "" });

    entries = entries.filter((e) => {
      const entryTokens = buildDeletedSet(e);
      for (const token of tokensToRemove) {
        if (entryTokens.has(token)) return false; // remove this entry
      }
      return true;
    });
    fs.writeFileSync(DELETED_PRODUCTS_FILE, JSON.stringify(entries, null, 2), "utf-8");
  } catch (err) {
    console.warn("[products] Failed to update deleted-products manifest on re-import:", err);
  }
}

let cachedLocalProducts: Product[] | null = null;
let cachedProductsResponse: { data: Product[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds catalog cache

export function invalidateProductsCache(): void {
  cachedProductsResponse = null;
  cachedLocalProducts = null;
}

export function getLocalProducts(): Product[] {
  if (cachedLocalProducts) {
    return cachedLocalProducts;
  }
  try {
    ensureDataDirExists();
    if (fs.existsSync(LOCAL_PRODUCTS_FILE)) {
      const content = fs.readFileSync(LOCAL_PRODUCTS_FILE, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list) && list.length > 0) {
        // Filter out any products that have been permanently deleted
        const deletedIds = getDeletedProductIds();
        const filtered = deletedIds.size > 0
          ? (list as Product[]).filter((p) => !isProductDeleted(deletedIds, p))
          : (list as Product[]);
        cachedLocalProducts = filtered;
        return filtered;
      }
    }
  } catch (err) {
    console.warn("[products] Failed to read local products file:", err);
  }
  cachedLocalProducts = FALLBACK_PRODUCTS;
  return FALLBACK_PRODUCTS;
}

export async function saveProduct(product: Product): Promise<Product> {
  invalidateProductsCache();

  // If this product was previously permanently deleted, clear its deletion marker.
  // An explicit admin save (fresh import / re-import) intentionally recreates it.
  removeFromDeletedManifest(product.id, product.slug, product.cj_product_id);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminSupabaseClient();
      const uuid = stringToUuid(product.id);
      const payload: Record<string, any> = {
        id: uuid,
        title: product.title,
        description: product.description || null,
        price: product.price,
        image: product.image || null,
        affiliate_link: product.affiliate_link || "",
        created_at: product.created_at || new Date().toISOString(),
        slug: product.slug || product.id,
        category: product.category || "General",
        badge: product.badge || null,
        variants: Array.isArray(product.variants) ? product.variants : [],
        images: Array.isArray(product.images) && product.images.length > 0 ? product.images : (product.image ? [product.image] : []),
      };
      if (product.cj_product_id) {
        payload.cj_product_id = product.cj_product_id;
      }

      let { error } = await supabase.from("products").upsert(payload, { onConflict: "id" });

      let attempt = 0;
      while (error && error.message.includes("column") && attempt < 5) {
        attempt++;
        console.warn(`[products] Notice: Missing column in Supabase products table ("${error.message}"). Stripping column and retrying attempt ${attempt}...`);
        if (error.message.includes("cj_product_id")) delete payload.cj_product_id;
        if (error.message.includes("variants")) delete payload.variants;
        if (error.message.includes("images")) delete payload.images;
        const retry = await supabase.from("products").upsert(payload, { onConflict: "id" });
        error = retry.error;
      }

      if (error) {
        console.error("[products] Supabase product upsert failed:", error.message);
        throw new Error(`Supabase persistence failed: ${error.message}`);
      } else {
        console.info(`[products] Successfully persisted product metadata to Supabase: ${product.id}`);
      }
    } catch (err) {
      console.error("[products] Exception during Supabase product upsert:", err);
      throw err;
    }
  }

  // Update local file snapshot to retain complete variant lists across sessions
  try {
    ensureDataDirExists();
    const existing = getLocalProducts();
    const uuid = stringToUuid(product.id);
    const index = existing.findIndex(
      (p) =>
        p.id === product.id ||
        stringToUuid(p.id) === uuid ||
        p.slug === product.slug ||
        (product.slug && (p.slug.startsWith(product.slug) || product.slug.startsWith(p.slug) || p.slug.replace(/-\d+$/, "") === product.slug.replace(/-\d+$/, ""))) ||
        (p.cj_product_id && product.cj_product_id && p.cj_product_id === product.cj_product_id) ||
        (product.cj_product_id && (p.id === `cj-${product.cj_product_id}` || stringToUuid(p.id) === stringToUuid(`cj-${product.cj_product_id}`)))
    );

    let updated: Product[];
    if (index >= 0) {
      updated = [...existing];
      const mergedVariants =
        product.variants && product.variants.length > 0
          ? product.variants
          : updated[index].variants || [];

      const mergedImages =
        product.images && product.images.length > 0
          ? product.images
          : updated[index].images || [];

      updated[index] = {
        ...updated[index],
        ...product,
        variants: mergedVariants,
        images: mergedImages,
      };
    } else {
      updated = [product, ...existing];
    }

    fs.writeFileSync(LOCAL_PRODUCTS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    cachedLocalProducts = updated;
    invalidateProductsCache();
  } catch (err) {
    console.warn("[products] Local product snapshot save failed:", err);
  }

  return product;
}

export function saveLocalProduct(product: Product): Product {
  // Synchronously invalidate cache & fire Supabase save
  invalidateProductsCache();
  Promise.resolve(saveProduct(product)).catch((e) =>
    console.error("[products] Async saveProduct failed:", e)
  );
  return product;
}

export async function deleteProduct(id: string): Promise<boolean> {
  invalidateProductsCache();

  // ── Step 1: Collect product identifiers before deletion (for manifest) ──────
  let productSlug: string | undefined;
  let productCjId: string | undefined;

  try {
    // Attempt to find the product in local snapshot first (fast, no network)
    const localSnapshot = (() => {
      try {
        if (fs.existsSync(LOCAL_PRODUCTS_FILE)) {
          const raw = fs.readFileSync(LOCAL_PRODUCTS_FILE, "utf-8");
          const list: Product[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            const uuid = stringToUuid(id);
            return list.find(
              (p) =>
                p.id === id ||
                stringToUuid(p.id) === uuid ||
                p.slug === id ||
                p.cj_product_id === id
            );
          }
        }
      } catch {
        // Ignore read errors
      }
      return undefined;
    })();

    if (localSnapshot) {
      productSlug = localSnapshot.slug;
      productCjId = localSnapshot.cj_product_id ?? undefined;
    }
  } catch {
    // Non-fatal: manifest will still contain the raw id
  }

  // ── Step 2: Delete from Supabase ─────────────────────────────────────────
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminSupabaseClient();
      const uuid = stringToUuid(id);
      const { error } = await supabase
        .from("products")
        .delete()
        .or(`id.eq.${uuid},slug.eq.${id}`);

      if (error) {
        console.error("[products] Supabase product deletion failed:", error.message);
      } else {
        console.info(`[products] Successfully deleted product from Supabase: ${id}`);
      }
    } catch (err) {
      console.error("[products] Exception during Supabase product deletion:", err);
    }
  }

  // ── Step 3: ALWAYS remove from data/products.json (prevents resurrection) ─
  // This runs regardless of ENABLE_JSON_FALLBACK because saveProduct() always
  // writes to the local snapshot. If we skip this, the deleted product will be
  // merged back into the catalog on the next getProducts() call.
  try {
    ensureDataDirExists();
    if (fs.existsSync(LOCAL_PRODUCTS_FILE)) {
      const raw = fs.readFileSync(LOCAL_PRODUCTS_FILE, "utf-8");
      const existing: Product[] = JSON.parse(raw);
      if (Array.isArray(existing)) {
        const uuid = stringToUuid(id);
        const filtered = existing.filter(
          (p) =>
            p.id !== id &&
            stringToUuid(p.id) !== uuid &&
            p.slug !== id &&
            p.cj_product_id !== id &&
            String(p.printful_sync_id) !== id &&
            String(p.printful_product_id) !== id &&
            // Also catch the CJ-prefixed form of the id
            p.id !== `cj-${id}` &&
            stringToUuid(p.id) !== stringToUuid(`cj-${id}`)
        );
        fs.writeFileSync(LOCAL_PRODUCTS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
        cachedLocalProducts = filtered;
        console.info(`[products] Removed product "${id}" from local JSON snapshot (${existing.length - filtered.length} record(s) removed).`);
      }
    }
  } catch (err) {
    console.warn("[products] Local JSON snapshot cleanup failed:", err);
  }

  // ── Step 4: Add to deleted-products manifest (prevents all resurrection) ──
  // This is the permanent guard. Even if local JSON somehow retains the product
  // (e.g. write failure above), getLocalProducts() and the getProducts() merge
  // loop will filter it out using this manifest.
  addToDeletedManifest(id, productSlug, productCjId);
  console.info(`[products] Product "${id}" added to deleted-products manifest (slug: ${productSlug ?? "n/a"}, cjPid: ${productCjId ?? "n/a"}).`);

  return true;
}

export function deleteLocalProduct(id: string): boolean {
  invalidateProductsCache();
  Promise.resolve(deleteProduct(id)).catch((e) =>
    console.error("[products] Async deleteProduct failed:", e)
  );
  return true;
}

export function validateProductInput(input: Partial<ProductInput>) {
  const errors: string[] = [];

  if (!input.title?.trim()) errors.push("Title is required.");
  if (!input.slug?.trim()) errors.push("Slug is required.");
  if (!input.affiliate_link?.trim()) errors.push("Affiliate link is required.");

  if (input.affiliate_link) {
    try {
      new URL(input.affiliate_link);
    } catch {
      errors.push("Affiliate link must be a valid URL.");
    }
  }

  return errors;
}

export function normalizeProductInput(input: ProductInput): ProductInput {
  const price = input.price != null ? Number(input.price) : null;
  const costPrice = input.cost_price != null ? Number(input.cost_price) : null;

  let profit: number | null = input.profit != null ? Number(input.profit) : null;
  let marginPercent: number | null = input.margin_percent != null ? Number(input.margin_percent) : null;

  if ((profit == null || marginPercent == null) && price != null && costPrice != null) {
    const metrics = calculateProfitMetrics(costPrice, price);
    profit = metrics.profit;
    marginPercent = metrics.marginPercent;
  }

  return {
    title: input.title.trim(),
    slug: input.slug.trim().toLowerCase(),
    short_description: input.short_description?.trim() || null,
    description: input.description?.trim() || null,
    category: input.category?.trim() || null,
    collections: Array.isArray(input.collections)
      ? input.collections
      : typeof input.collections === "string"
        ? (input.collections as string).split(",").map((s) => s.trim()).filter(Boolean)
        : null,
    tags: Array.isArray(input.tags)
      ? input.tags
      : typeof input.tags === "string"
        ? (input.tags as string).split(",").map((s) => s.trim()).filter(Boolean)
        : null,
    brand: input.brand?.trim() || null,
    badge: input.badge?.trim() || null,
    price,
    compare_at_price: input.compare_at_price != null ? Number(input.compare_at_price) : null,
    cost_price: costPrice,
    profit,
    margin_percent: marginPercent,
    price_manually_overridden: Boolean(input.price_manually_overridden),
    image: input.image?.trim() || null,
    images: Array.isArray(input.images) ? input.images.filter(Boolean) : null,
    variants: Array.isArray(input.variants) ? input.variants : null,
    sku: input.sku?.trim() || null,
    inventory_quantity: input.inventory_quantity != null ? Number(input.inventory_quantity) : null,
    weight: input.weight?.trim() || null,
    dimensions: input.dimensions?.trim() || null,
    seo_title: input.seo_title?.trim() || null,
    seo_description: input.seo_description?.trim() || null,
    status: input.status || "published",
    affiliate_link: input.affiliate_link.trim(),
    cj_product_id: input.cj_product_id?.trim() || null,
  };
}

export async function getUniqueSlug(
  supabase: any,
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const normalizedBase = baseSlug.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from("products")
      .select("slug, id")
      .or(`slug.eq.${normalizedBase},slug.ilike.${normalizedBase}-%`);

    if (!error && data) {
      const existingSlugs = new Set(
        (data as { slug: string; id: string }[])
          .filter((p) => p.id !== excludeId)
          .map((p) => p.slug.toLowerCase())
      );

      if (!existingSlugs.has(normalizedBase)) {
        return normalizedBase;
      }

      let counter = 2;
      while (true) {
        const candidate = `${normalizedBase}-${counter}`;
        if (!existingSlugs.has(candidate)) {
          return candidate;
        }
        counter++;
      }
    }
  } catch {
    // Fall back to local slug resolution if Supabase query fails
  }

  const localProducts = getLocalProducts();
  const existingSlugs = new Set(
    localProducts.filter((p) => p.id !== excludeId).map((p) => p.slug.toLowerCase())
  );

  let counter = 2;
  while (true) {
    const candidate = `${normalizedBase}-${counter}`;
    if (!existingSlugs.has(candidate)) {
      return candidate;
    }
    counter++;
  }
}

async function queryWithTimeout<T>(promise: PromiseLike<T>, timeoutMs = 1500): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Supabase query timed out")), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export const getProducts = cache(async function getProducts(): Promise<Product[]> {
  const now = Date.now();
  if (cachedProductsResponse && now - cachedProductsResponse.timestamp < CACHE_TTL_MS) {
    return cachedProductsResponse.data;
  }

  if (!isSupabaseConfigured()) {
    if (isJsonFallbackEnabled()) {
      const local = getLocalProducts();
      cachedProductsResponse = { data: local, timestamp: now };
      return local;
    }
    console.warn("[products] Supabase is not configured. Serving default static seed catalog.");
    cachedProductsResponse = { data: FALLBACK_PRODUCTS, timestamp: now };
    return FALLBACK_PRODUCTS;
  }

  try {
    const query = createPublicSupabaseClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("created_at", { ascending: false });

    const { data, error } = await queryWithTimeout(query, 2000);

    if (error || !data || data.length === 0) {
      if (isJsonFallbackEnabled()) {
        console.warn("[products] Supabase query returned no rows. Serving local JSON catalog (Dev Fallback Enabled).");
        const local = getLocalProducts();
        cachedProductsResponse = { data: local, timestamp: now };
        return local;
      }
      console.warn("[products] Supabase query returned no rows:", error?.message);
      cachedProductsResponse = { data: [], timestamp: now };
      return [];
    }

    // Read the deleted manifest once; used throughout this function
    const deletedIds = getDeletedProductIds();

    const allLocalProducts = getLocalProducts();
    const matchedLocalIds = new Set<string>();

    const products = data.map((item: any) => {
      const itemCjId = item.cj_product_id || (item.slug?.startsWith("cj-") ? item.slug.replace("cj-", "") : null);

      const localMatch = allLocalProducts.find(
        (p) =>
          p.id === item.id ||
          stringToUuid(p.id) === item.id ||
          p.slug === item.slug ||
          (item.slug && p.slug && (item.slug.startsWith(p.slug) || p.slug.startsWith(item.slug) || item.slug.replace(/-\d+$/, "") === p.slug.replace(/-\d+$/, ""))) ||
          (itemCjId && (p.cj_product_id === itemCjId || p.id === `cj-${itemCjId}` || stringToUuid(p.id) === stringToUuid(`cj-${itemCjId}`))) ||
          (p.cj_product_id && (
            p.cj_product_id === item.cj_product_id ||
            item.slug?.includes(p.cj_product_id) ||
            item.id === stringToUuid(`cj-${p.cj_product_id}`)
          ))
      );

      if (localMatch) {
        matchedLocalIds.add(localMatch.id);
        if (localMatch.cj_product_id) matchedLocalIds.add(localMatch.cj_product_id);
      }

      const dbVariants = Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : null;
      const dbImages = Array.isArray(item.images) && item.images.length > 0 ? item.images : null;

      const finalVariants = dbVariants || (localMatch?.variants && localMatch.variants.length > 0 ? localMatch.variants : []);
      let finalImages = dbImages || (localMatch?.images && localMatch.images.length > 0 ? localMatch.images : []);

      if (finalImages.length === 0 && item.image) {
        finalImages = [item.image];
      }

      return {
        id: localMatch?.id || item.id,
        title: item.title,
        slug: item.slug || item.id,
        description: item.description || localMatch?.description || null,
        category: item.category || localMatch?.category || "General",
        collections: localMatch?.collections || null,
        tags: localMatch?.tags || null,
        badge: item.badge || localMatch?.badge || null,
        price: item.price ?? localMatch?.price ?? 0,
        compare_at_price: localMatch?.compare_at_price || null,
        cost_price: localMatch?.cost_price || null,
        profit: localMatch?.profit || null,
        margin_percent: localMatch?.margin_percent || null,
        image: item.image || localMatch?.image || null,
        images: finalImages,
        variants: finalVariants,
        sku: localMatch?.sku || null,
        inventory_quantity: localMatch?.inventory_quantity ?? (finalVariants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 999),
        affiliate_link: item.affiliate_link || localMatch?.affiliate_link || "",
        cj_product_id: itemCjId || localMatch?.cj_product_id || null,
        printful_product_id: localMatch?.printful_product_id || null,
        printful_sync_id: localMatch?.printful_sync_id || null,
        is_original: localMatch?.is_original || false,
        supplier_type: localMatch?.supplier_type || null,
        created_at: item.created_at || localMatch?.created_at || new Date().toISOString(),
      } as Product;
    });

    // LOCAL JSON IS ENRICHMENT-ONLY IN PRODUCTION.
    // When Supabase is configured and has returned data, local JSON is used ONLY to hydrate
    // Supabase records with extra fields (variants, images, etc.). We do NOT add products that
    // exist only in local JSON to the Supabase result set.
    //
    // This is the production-safe rule: Supabase is authoritative for product existence.
    // A product deleted from Supabase must NOT reappear just because it is still present
    // in the static bundled data/products.json (which is read-only on Vercel and cannot
    // be mutated at runtime).
    //
    // EXCEPTION: In local development with ENABLE_JSON_FALLBACK=true, local-only products
    // ARE added (e.g. seed data not yet imported to Supabase).
    if (isJsonFallbackEnabled()) {
      for (const localP of allLocalProducts) {
        if (isProductDeleted(deletedIds, localP)) continue; // deleted manifest guard (localhost)
        if (!matchedLocalIds.has(localP.id) && !products.some((p) => p.id === localP.id || p.slug === localP.slug)) {
          products.push(localP);
        }
      }
    }

    cachedProductsResponse = { data: products, timestamp: now };
    return products;
  } catch (error: any) {
    console.warn("[products] Supabase query notice, fallback to local products:", error?.message);
    // Filter deleted products from the exception-path local fallback
    const deletedIds = getDeletedProductIds();
    const local = getLocalProducts().filter((p) => !isProductDeleted(deletedIds, p));
    cachedProductsResponse = { data: local, timestamp: now };
    return local;
  }
});

export const getProductBySlug = cache(async function getProductBySlug(slug: string): Promise<Product | null> {
  // Read deleted manifest once for all fallback guards in this function
  const deletedIds = getDeletedProductIds();

  // Helper: return null if the product is permanently deleted
  const guardDeleted = (p: Product | null | undefined): Product | null => {
    if (!p) return null;
    if (isProductDeleted(deletedIds, p)) return null;
    return p;
  };

  const products = await getProducts();
  const match = products.find(
    (p) =>
      p.slug === slug ||
      p.id === slug ||
      (p.slug && (slug.startsWith(p.slug) || p.slug.startsWith(slug) || slug.replace(/-\d+$/, "") === p.slug.replace(/-\d+$/, ""))) ||
      (p.cj_product_id && (p.cj_product_id === slug || slug.includes(p.cj_product_id)))
  );
  // getProducts() already filters deleted products (via getLocalProducts() + merge guard)
  if (match) return match;

  // Direct local-JSON fallback — only in development/fallback mode.
  // In production (Supabase configured, isJsonFallbackEnabled=false), we must NOT return a
  // product that Supabase doesn't have just because it appears in the static bundled JSON.
  // The bundled file is read-only on Vercel: any deletion from Supabase cannot be reflected
  // there, so using it as a product-existence source would always resurrect deleted products.
  if (isJsonFallbackEnabled()) {
    const localMatch = getLocalProducts().find(
      (p) =>
        p.slug === slug ||
        p.id === slug ||
        (p.slug && (slug.startsWith(p.slug) || p.slug.startsWith(slug) || slug.replace(/-\d+$/, "") === p.slug.replace(/-\d+$/, ""))) ||
        (p.cj_product_id && (p.cj_product_id === slug || slug.includes(p.cj_product_id)))
    );
    if (guardDeleted(localMatch)) return localMatch!;
  }

  if (!isSupabaseConfigured()) {
    return FALLBACK_PRODUCTS.find((p) => p.slug === slug || p.id === slug) ?? null;
  }

  try {
    const query = createPublicSupabaseClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();

    const { data, error } = await queryWithTimeout(query, 1500);

    if (error || !data) {
      // Supabase returned no row for this slug — product not found or deleted.
      // In production, absence from Supabase IS the deletion state. Do not resurrect
      // from local JSON. Only use local fallback in dev mode with JSON fallback enabled.
      if (!isJsonFallbackEnabled()) return null;
      const fallback = getLocalProducts().find((p) => p.slug === slug || p.id === slug || (p.slug && slug.replace(/-\d+$/, "") === p.slug.replace(/-\d+$/, "")));
      return guardDeleted(fallback);
    }

    // Supabase returned a row — check if it's permanently deleted before returning
    const dbProduct: Product = {
      id: data.id,
      title: data.title,
      slug: data.slug || data.id,
      description: data.description || null,
      category: data.category || "General",
      collections: null,
      tags: null,
      badge: data.badge || null,
      price: data.price ?? 0,
      compare_at_price: null,
      cost_price: null,
      profit: null,
      margin_percent: null,
      image: data.image || null,
      images: data.image ? [data.image] : [],
      variants: [],
      sku: null,
      inventory_quantity: 999,
      affiliate_link: data.affiliate_link || "",
      cj_product_id: data.cj_product_id || null,
      printful_product_id: null,
      printful_sync_id: null,
      is_original: false,
      supplier_type: null,
      created_at: data.created_at || new Date().toISOString(),
    };
    if (isProductDeleted(deletedIds, dbProduct)) return null;

    const enrichedLocalMatch = getLocalProducts().find(
      (p) =>
        p.slug === data.slug ||
        p.id === data.id ||
        stringToUuid(p.id) === data.id ||
        (p.slug && data.slug && (data.slug.startsWith(p.slug) || p.slug.startsWith(data.slug) || data.slug.replace(/-\d+$/, "") === p.slug.replace(/-\d+$/, ""))) ||
        (p.cj_product_id && data.cj_product_id && p.cj_product_id === data.cj_product_id)
    );
    return {
      id: enrichedLocalMatch?.id || data.id,
      title: data.title,
      slug: data.slug || data.id,
      description: data.description || enrichedLocalMatch?.description || null,
      category: data.category || enrichedLocalMatch?.category || "General",
      collections: enrichedLocalMatch?.collections || null,
      tags: enrichedLocalMatch?.tags || null,
      badge: data.badge || enrichedLocalMatch?.badge || null,
      price: data.price ?? enrichedLocalMatch?.price ?? 0,
      compare_at_price: enrichedLocalMatch?.compare_at_price || null,
      cost_price: enrichedLocalMatch?.cost_price || null,
      profit: enrichedLocalMatch?.profit || null,
      margin_percent: enrichedLocalMatch?.margin_percent || null,
      image: data.image || enrichedLocalMatch?.image || null,
      images: enrichedLocalMatch?.images || (data.image ? [data.image] : []),
      variants: enrichedLocalMatch?.variants && enrichedLocalMatch.variants.length > 0 ? enrichedLocalMatch.variants : [],
      sku: enrichedLocalMatch?.sku || null,
      inventory_quantity: enrichedLocalMatch?.inventory_quantity ?? 999,
      affiliate_link: data.affiliate_link || enrichedLocalMatch?.affiliate_link || "",
      cj_product_id: enrichedLocalMatch?.cj_product_id || null,
      printful_product_id: enrichedLocalMatch?.printful_product_id || null,
      printful_sync_id: enrichedLocalMatch?.printful_sync_id || null,
      is_original: enrichedLocalMatch?.is_original || false,
      supplier_type: enrichedLocalMatch?.supplier_type || null,
      created_at: data.created_at || enrichedLocalMatch?.created_at || new Date().toISOString(),
    } as Product;
  } catch (error: any) {
    // Supabase query threw an exception — only use local fallback in dev mode.
    // In production, returning null is safer than resurrecting a deleted product.
    if (!isJsonFallbackEnabled()) return null;
    const fallback = getLocalProducts().find((p) => p.slug === slug || p.id === slug);
    return guardDeleted(fallback);
  }
});

export async function getLuxuryProducts(): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => {
    if (p.is_original) return false;
    if (p.collections?.includes("luxury")) return true;
    if (p.category?.toLowerCase().includes("luxury") || p.category?.toLowerCase().includes("timepiece")) return true;
    return (p.price ?? 0) >= 150;
  });
}

export async function getOriginalsProducts(): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => {
    return (
      Boolean(p.is_original) ||
      p.category?.toLowerCase().includes("original") ||
      p.collections?.includes("originals") ||
      p.badge?.toLowerCase().includes("ra2z original")
    );
  });
}
