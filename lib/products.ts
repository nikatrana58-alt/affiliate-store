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

function ensureDataDirExists() {
  const dir = path.dirname(LOCAL_PRODUCTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
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
        cachedLocalProducts = list;
        return list;
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

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminSupabaseClient();
      const uuid = stringToUuid(product.id);
      const payload = {
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
      };

      const { error } = await supabase.from("products").upsert(payload, { onConflict: "id" });
      if (error) {
        console.error("[products] Supabase product upsert failed:", error.message);
      } else {
        console.info(`[products] Successfully persisted product to Supabase: ${product.id}`);
      }
    } catch (err) {
      console.error("[products] Exception during Supabase product upsert:", err);
    }
  }

  // Only update local file snapshot if dev fallback flag is explicitly enabled
  if (isJsonFallbackEnabled()) {
    try {
      ensureDataDirExists();
      const existing = getLocalProducts();
      const index = existing.findIndex(
        (p) => p.id === product.id || (p.cj_product_id && p.cj_product_id === product.cj_product_id)
      );

      let updated: Product[];
      if (index >= 0) {
        updated = [...existing];
        updated[index] = { ...updated[index], ...product };
      } else {
        updated = [product, ...existing];
      }

      fs.writeFileSync(LOCAL_PRODUCTS_FILE, JSON.stringify(updated, null, 2), "utf-8");
      cachedLocalProducts = updated;
    } catch (err) {
      console.warn("[products] Dev-only local product save failed:", err);
    }
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

  // Only delete from local file snapshot if dev fallback flag is explicitly enabled
  if (isJsonFallbackEnabled()) {
    try {
      ensureDataDirExists();
      const existing = getLocalProducts();
      const filtered = existing.filter(
        (p) =>
          p.id !== id &&
          p.cj_product_id !== id &&
          String(p.printful_sync_id) !== id &&
          String(p.printful_product_id) !== id &&
          p.slug !== id
      );
      fs.writeFileSync(LOCAL_PRODUCTS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      cachedLocalProducts = filtered;
    } catch (err) {
      console.warn("[products] Dev-only local product delete failed:", err);
    }
  }

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

    const localMap = new Map(getLocalProducts().map((p) => [p.slug, p]));
    const products = data.map((item: any) => {
      const localMatch = localMap.get(item.slug);
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
        images: localMatch?.images || (item.image ? [item.image] : []),
        variants: localMatch?.variants || [],
        sku: localMatch?.sku || null,
        inventory_quantity: localMatch?.inventory_quantity ?? 999,
        affiliate_link: item.affiliate_link || localMatch?.affiliate_link || "",
        cj_product_id: localMatch?.cj_product_id || (item.slug?.startsWith("cj-") ? item.slug : null),
        printful_product_id: localMatch?.printful_product_id || null,
        printful_sync_id: localMatch?.printful_sync_id || null,
        is_original: localMatch?.is_original || false,
        supplier_type: localMatch?.supplier_type || null,
        created_at: item.created_at || localMatch?.created_at || new Date().toISOString(),
      } as Product;
    });

    cachedProductsResponse = { data: products, timestamp: now };
    return products;
  } catch (error: any) {
    if (isJsonFallbackEnabled()) {
      console.warn("[products] Supabase exception. Serving local JSON catalog (Dev Fallback Enabled):", error?.message);
      const local = getLocalProducts();
      cachedProductsResponse = { data: local, timestamp: now };
      return local;
    }
    console.error("[products] Exception during Supabase getProducts():", error?.message);
    cachedProductsResponse = { data: [], timestamp: now };
    return [];
  }
});

export const getProductBySlug = cache(async function getProductBySlug(slug: string): Promise<Product | null> {
  const products = await getProducts();
  const match = products.find((p) => p.slug === slug);
  if (match) return match;

  if (!isSupabaseConfigured()) {
    if (isJsonFallbackEnabled()) {
      return getLocalProducts().find((p) => p.slug === slug) ?? null;
    }
    return FALLBACK_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }

  try {
    const query = createPublicSupabaseClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();

    const { data, error } = await queryWithTimeout(query, 1500);

    if (error || !data) {
      if (isJsonFallbackEnabled()) {
        return getLocalProducts().find((p) => p.slug === slug) ?? null;
      }
      return null;
    }

    const localMatch = getLocalProducts().find((p) => p.slug === slug);
    return {
      id: localMatch?.id || data.id,
      title: data.title,
      slug: data.slug || data.id,
      description: data.description || localMatch?.description || null,
      category: data.category || localMatch?.category || "General",
      collections: localMatch?.collections || null,
      tags: localMatch?.tags || null,
      badge: data.badge || localMatch?.badge || null,
      price: data.price ?? localMatch?.price ?? 0,
      compare_at_price: localMatch?.compare_at_price || null,
      cost_price: localMatch?.cost_price || null,
      profit: localMatch?.profit || null,
      margin_percent: localMatch?.margin_percent || null,
      image: data.image || localMatch?.image || null,
      images: localMatch?.images || (data.image ? [data.image] : []),
      variants: localMatch?.variants || [],
      sku: localMatch?.sku || null,
      inventory_quantity: localMatch?.inventory_quantity ?? 999,
      affiliate_link: data.affiliate_link || localMatch?.affiliate_link || "",
      cj_product_id: localMatch?.cj_product_id || null,
      printful_product_id: localMatch?.printful_product_id || null,
      printful_sync_id: localMatch?.printful_sync_id || null,
      is_original: localMatch?.is_original || false,
      supplier_type: localMatch?.supplier_type || null,
      created_at: data.created_at || localMatch?.created_at || new Date().toISOString(),
    } as Product;
  } catch (error: any) {
    if (isJsonFallbackEnabled()) {
      return getLocalProducts().find((p) => p.slug === slug) ?? null;
    }
    return null;
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
