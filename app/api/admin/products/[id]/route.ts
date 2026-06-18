import { requireCurrentAdmin } from "@/lib/auth/admin";
import {
  getUniqueSlug,
  normalizeProductInput,
  PRODUCT_COLUMNS,
  type ProductInput,
  validateProductInput,
} from "@/lib/products";
import { createAdminSupabaseClient } from "@/lib/supabase";

type ProductRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: ProductRouteContext) {
  try {
    const admin = await requireCurrentAdmin();
    const { id } = await params;
    const input = (await request.json()) as ProductInput;
    const validationErrors = validateProductInput(input);

    if (validationErrors.length) {
      return Response.json({ error: validationErrors.join(" ") }, { status: 400 });
    }

    const normalizedInput = normalizeProductInput(input);
    const supabase = createAdminSupabaseClient();

    // Automatically generate a unique slug if there's a collision
    const uniqueSlug = await getUniqueSlug(supabase, normalizedInput.slug, id);
    normalizedInput.slug = uniqueSlug;

    console.info("[products] Updating product.", {
      adminUid: admin.uid,
      id,
      slug: normalizedInput.slug,
    });

    const { data, error } = await supabase
      .from("products")
      .update(normalizedInput)
      .eq("id", id)
      .select(PRODUCT_COLUMNS)
      .single();

    if (error) throw error;

    console.info("[products] Product updated.", { id: data.id, slug: data.slug });

    return Response.json({ product: data });
  } catch (error) {
    console.error("[products] Product update failed.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to update product." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: ProductRouteContext) {
  try {
    const admin = await requireCurrentAdmin();
    const { id } = await params;

    console.info("[products] Deleting product.", { adminUid: admin.uid, id });

    const { error } = await createAdminSupabaseClient()
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.info("[products] Product deleted.", { id });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[products] Product delete failed.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to delete product." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 },
    );
  }
}
