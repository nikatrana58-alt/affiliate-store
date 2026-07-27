import { createPublicSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type Product = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  badge: string | null;
  price: number | null;
  image: string | null;
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
  return {
    title: input.title.trim(),
    slug: input.slug.trim().toLowerCase(),
    description: input.description?.trim() || null,
    category: input.category?.trim() || null,
    badge: input.badge?.trim() || null,
    price: input.price ?? null,
    image: input.image?.trim() || null,
    affiliate_link: input.affiliate_link.trim(),
  };
}

export async function getUniqueSlug(
  supabase: any,
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const normalizedBase = baseSlug.trim().toLowerCase();
  
  const { data, error } = await supabase
    .from("products")
    .select("slug, id")
    .or(`slug.eq.${normalizedBase},slug.ilike.${normalizedBase}-%`);

  if (error) throw error;

  const existingSlugs = new Set((data as { slug: string, id: string }[])
    .filter(p => p.id !== excludeId)
    .map(p => p.slug.toLowerCase()));

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

export async function getProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_PRODUCTS;
  }

  try {
    const { data, error } = await createPublicSupabaseClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[products] Supabase query returned error, using fallback catalog:", error.message);
      return FALLBACK_PRODUCTS;
    }

    if (!data || data.length === 0) {
      return FALLBACK_PRODUCTS;
    }

    return data as Product[];
  } catch (error: any) {
    console.warn("[products] Unable to reach Supabase database. Serving fallback catalog.");
    return FALLBACK_PRODUCTS;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }

  try {
    const { data, error } = await createPublicSupabaseClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.warn("[products] Supabase query error for slug:", slug, error.message);
      return FALLBACK_PRODUCTS.find((p) => p.slug === slug) ?? null;
    }

    if (!data) {
      return FALLBACK_PRODUCTS.find((p) => p.slug === slug) ?? null;
    }

    return data as Product;
  } catch (error: any) {
    console.warn("[products] Unable to reach Supabase database for product. Serving fallback match.");
    return FALLBACK_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }
}
