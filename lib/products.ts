import { createPublicSupabaseClient } from "@/lib/supabase";

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
  created_at: string;
};

export type ProductInput = Omit<Product, "id" | "created_at">;

export const PRODUCT_COLUMNS =
  "id,title,slug,description,category,badge,price,image,affiliate_link,created_at";

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

export async function getProducts() {
  const { data, error } = await createPublicSupabaseClient()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Product[];
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await createPublicSupabaseClient()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;

  return data as Product | null;
}
