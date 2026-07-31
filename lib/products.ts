import fs from "fs";
import path from "path";
import { createPublicSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { calculateProfitMetrics } from "@/lib/pricing-engine";

export type ProductVariantItem = {
  id?: string;
  cj_variant_id?: string;
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
  created_at: string;
};

export type ProductInput = Omit<Product, "id" | "created_at">;

export const PRODUCT_COLUMNS =
  "id,title,slug,description,category,badge,price,image,affiliate_link,cj_product_id,created_at";

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "fallback-1",
    title: "Obsidian & Gold Chronograph Watch",
    slug: "obsidian-gold-chronograph-watch",
    description: "Handcrafted precision chronograph featuring a sapphire crystal face and obsidian leather strap.",
    category: "Timepieces",
    badge: "Editor's Pick",
    price: 495.0,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://example.com/watch",
    created_at: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "fallback-2",
    title: "Acoustic Noise-Canceling Headphones",
    slug: "acoustic-noise-canceling-headphones",
    description: "Studio-grade wireless audio with custom champagne gold accents and 40-hour battery life.",
    category: "Audio",
    badge: "Best Seller",
    price: 349.0,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://example.com/headphones",
    created_at: "2026-01-14T10:00:00.000Z",
  },
  {
    id: "fallback-3",
    title: "Minimalist Dual-Boiler Espresso Machine",
    slug: "minimalist-espresso-machine",
    description: "Italian designed dual-boiler espresso machine crafted from brushed titanium and matte black metal.",
    category: "Home & Living",
    badge: "Trending",
    price: 899.0,
    image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://example.com/espresso",
    created_at: "2026-01-13T10:00:00.000Z",
  },
  {
    id: "fallback-4",
    title: "Architectural Brass Desk Lamp",
    slug: "architectural-brass-desk-lamp",
    description: "Warm LED ambient lamp with touch dimming and solid brass weighted base.",
    category: "Lighting",
    badge: "Limited Edition",
    price: 180.0,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://example.com/lamp",
    created_at: "2026-01-12T10:00:00.000Z",
  },
  {
    id: "fallback-5",
    title: "Ergonomic Executive Leather Chair",
    slug: "ergonomic-executive-leather-chair",
    description: "Full-grain Nappa leather office chair engineered for lumbar support and effortless posture.",
    category: "Furniture",
    badge: "Top Rated",
    price: 750.0,
    image: "https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://example.com/chair",
    created_at: "2026-01-11T10:00:00.000Z",
  },
  {
    id: "fallback-6",
    title: "Ultra-Thin OLED Digital Reader",
    slug: "ultra-thin-oled-digital-reader",
    description: "Paper-like digital reader with anti-glare glass and warm backlighting for night reading.",
    category: "Tech",
    badge: "New Arrival",
    price: 260.0,
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80",
    affiliate_link: "https://example.com/reader",
    created_at: "2026-01-10T10:00:00.000Z",
  },
];

const LOCAL_PRODUCTS_FILE = path.join(process.cwd(), "data", "products.json");

function ensureDataDirExists() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let cachedLocalProducts: Product[] | null = null;

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

export function saveLocalProduct(product: Product): Product {
  cachedLocalProducts = null;
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
    return product;
  } catch (err) {
    console.error("[products] Failed to save local product file:", err);
    return product;
  }
}

export function deleteLocalProduct(id: string): boolean {
  cachedLocalProducts = null;
  try {
    ensureDataDirExists();
    const existing = getLocalProducts();
    const filtered = existing.filter(
      (p) => p.id !== id && p.cj_product_id !== id && p.slug !== id
    );
    fs.writeFileSync(LOCAL_PRODUCTS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    cachedLocalProducts = filtered;
    console.info(`[products] Permanent delete local product completed for ID/PID: ${id}`);
    return true;
  } catch (err) {
    console.error("[products] Failed to delete local product file:", err);
    return false;
  }
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

  let profit: number | null = input.profit ?? null;
  let marginPercent: number | null = input.margin_percent ?? null;

  if (price != null && costPrice != null) {
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

export async function getProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return getLocalProducts();
  }

  try {
    const query = createPublicSupabaseClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("created_at", { ascending: false });

    const { data, error } = await queryWithTimeout(query, 1500);

    if (error) {
      console.warn("[products] Supabase query returned error, using fallback catalog:", error.message);
      return getLocalProducts();
    }

    if (!data || data.length === 0) {
      return getLocalProducts();
    }

    return data as Product[];
  } catch (error: any) {
    console.warn("[products] Unable to reach Supabase database within 1.5s timeout. Serving fallback catalog.");
    return getLocalProducts();
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    return getLocalProducts().find((p) => p.slug === slug) ?? null;
  }

  try {
    const query = createPublicSupabaseClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();

    const { data, error } = await queryWithTimeout(query, 1500);

    if (error) {
      console.warn("[products] Supabase query error for slug:", slug, error.message);
      return getLocalProducts().find((p) => p.slug === slug) ?? null;
    }

    if (!data) {
      return getLocalProducts().find((p) => p.slug === slug) ?? null;
    }

    return data as Product;
  } catch (error: any) {
    console.warn("[products] Unable to reach Supabase database within 1.5s timeout. Serving fallback match.");
    return getLocalProducts().find((p) => p.slug === slug) ?? null;
  }
}
