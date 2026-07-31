import { requireCurrentAdmin } from "@/lib/auth/admin";
import {
  getProducts,
  getUniqueSlug,
  normalizeProductInput,
  PRODUCT_COLUMNS,
  saveLocalProduct,
  type Product,
  type ProductInput,
  validateProductInput,
} from "@/lib/products";
import { createAdminSupabaseClient } from "@/lib/supabase";

export async function GET() {
  try {
    await requireCurrentAdmin();
    const products = await getProducts();
    return Response.json({ products });
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message.toLowerCase().includes("admin"));

    console.error("[products] Unable to load admin product list.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load products." },
      { status: isAuthError ? 401 : 500 },
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
    const supabase = createAdminSupabaseClient();

    // Automatically generate a unique slug if there's a collision
    const uniqueSlug = await getUniqueSlug(supabase, normalizedInput.slug);
    normalizedInput.slug = uniqueSlug;

    console.info("[products] Saving product.", {
      adminUid: admin.uid,
      slug: normalizedInput.slug,
      title: normalizedInput.title,
    });

    let savedProduct: Product | null = null;
    try {
      const { data, error } = await supabase
        .from("products")
        .insert(normalizedInput)
        .select(PRODUCT_COLUMNS)
        .single();

      if (!error && data) {
        savedProduct = data as Product;
      }
    } catch (dbErr) {
      console.warn("[products] Supabase insert failed, saving to local store:", dbErr);
    }

    if (!savedProduct) {
      const fallbackObj: Product = {
        id: `prod-${Date.now().toString(36)}`,
        ...normalizedInput,
        created_at: new Date().toISOString(),
      };
      savedProduct = saveLocalProduct(fallbackObj);
    } else {
      saveLocalProduct(savedProduct);
    }

    console.info("[products] Product saved.", { id: savedProduct.id, slug: savedProduct.slug });

    return Response.json({ product: savedProduct }, { status: 201 });
  } catch (error) {
    console.error("[products] Product save failed.", error);

    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to save product." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 },
    );
  }
}
