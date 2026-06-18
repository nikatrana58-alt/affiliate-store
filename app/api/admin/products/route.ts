import { requireCurrentAdmin } from "@/lib/auth/admin";
import {
  normalizeProductInput,
  PRODUCT_COLUMNS,
  type ProductInput,
  validateProductInput,
} from "@/lib/products";
import { createAdminSupabaseClient } from "@/lib/supabase";

export async function GET() {
  try {
    await requireCurrentAdmin();

    const { data, error } = await createAdminSupabaseClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return Response.json({ products: data ?? [] });
  } catch (error) {
    console.error("[products] Unable to load admin product list.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load products." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireCurrentAdmin();
    const input = (await request.json()) as ProductInput;
    const validationErrors = validateProductInput(input);

    if (validationErrors.length) {
      return Response.json({ error: validationErrors.join(" ") }, { status: 400 });
    }

    const normalizedInput = normalizeProductInput(input);
    const slug = normalizedInput.slug;

    console.info("[products] Checking if slug already exists.", {
      slug,
    });

    const { data: existingProduct, error: slugLookupError } = await createAdminSupabaseClient()
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (slugLookupError) throw slugLookupError;

    if (existingProduct) {
      throw new Error("Slug already exists");
    }

    console.info("[products] Saving product.", {
      adminUid: admin.uid,
      slug: normalizedInput.slug,
      title: normalizedInput.title,
    });

    const { data, error } = await createAdminSupabaseClient()
      .from("products")
      .insert(normalizedInput)
      .select(PRODUCT_COLUMNS)
      .single();

    if (error) throw error;

    console.info("[products] Product saved.", { id: data.id, slug: data.slug });

    return Response.json({ product: data }, { status: 201 });
  } catch (error) {
    console.error("[products] Product save failed.", error);
    console.error("FULL SUPABASE ERROR:", error);
    console.error("typeof error:", typeof error);
    console.error("JSON.stringify(error):", JSON.stringify(error, null, 2));

    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to save product." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 },
    );
  }
}
