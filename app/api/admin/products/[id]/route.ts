import { requireCurrentAdmin } from "@/lib/auth/admin";
import {
  deleteProduct,
  getUniqueSlug,
  normalizeProductInput,
  saveProduct,
  stringToUuid,
  type Product,
  type ProductInput,
  validateProductInput,
} from "@/lib/products";
import { createAdminSupabaseClient } from "@/lib/supabase";

type ProductRouteContext = {
  params: Promise<{ id: string }>;
};

/** Cloudinary Asset Cleanup Helper */
async function cleanupCloudinaryImages(imageUrls: string[]) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.info("[cloudinary-cleanup] Cloudinary Admin API credentials not fully configured, skipping remote asset destruction.");
    return;
  }

  for (const url of imageUrls) {
    if (!url || !url.includes("cloudinary.com")) continue;

    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
      if (!match || !match[1]) continue;

      const publicId = match[1];
      const timestamp = Math.floor(Date.now() / 1000);

      const crypto = await import("crypto");
      const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

      const formData = new URLSearchParams();
      formData.append("public_id", publicId);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      if (res.ok) {
        console.info(`[cloudinary-cleanup] Successfully destroyed Cloudinary asset public_id: "${publicId}"`);
      } else {
        console.warn(`[cloudinary-cleanup] Cloudinary destroy returned HTTP ${res.status} for public_id "${publicId}"`);
      }
    } catch (err) {
      console.warn(`[cloudinary-cleanup] Error destroying asset "${url}":`, err);
    }
  }
}

export async function PUT(request: Request, { params }: ProductRouteContext) {
  try {
    const admin = await requireCurrentAdmin();
    const { id } = await params;
    const input = (await request.json()) as ProductInput;
    const validationErrors = validateProductInput(input);

    console.info(`[product-save] Payload Received by API for ID "${id}":`, input);

    if (validationErrors.length) {
      console.warn(`[product-save] Validation failed for ID "${id}":`, validationErrors);
      return Response.json({ error: validationErrors.join(" ") }, { status: 400 });
    }

    const normalizedInput = normalizeProductInput(input);
    const supabase = createAdminSupabaseClient();

    console.info(`[product-save] Normalized Input for DB Update:`, normalizedInput);

    const uniqueSlug = await getUniqueSlug(supabase, normalizedInput.slug, id);
    normalizedInput.slug = uniqueSlug;

    const productPayload: Product = {
      id,
      ...normalizedInput,
      created_at: new Date().toISOString(),
    };

    console.info(`[product-save] Saving product "${id}" to Supabase primary database...`);
    const updatedProduct = await saveProduct(productPayload);

    console.info(`[product-save] Returning API response for ID "${id}"`);
    return Response.json({ product: updatedProduct });
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message.toLowerCase().includes("admin"));

    console.error("[products] Product update failed.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to update product." },
      { status: isAuthError ? 401 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: ProductRouteContext) {
  try {
    const admin = await requireCurrentAdmin();
    const { id } = await params;

    if (!id?.trim()) {
      return Response.json({ error: "Product ID is required." }, { status: 400 });
    }

    const productId = id.trim();
    console.info(`[products/delete] Permanent product deletion requested by admin ${admin.uid} for ID: "${productId}"`);

    const supabase = createAdminSupabaseClient();
    const imagesToClean: string[] = [];

    // Step 0: Fetch product details to collect images prior to deletion
    try {
      const { data: dbProd } = await supabase
        .from("products")
        .select("id, image, images, cj_product_id")
        .or(`id.eq.${stringToUuid(productId)},slug.eq.${productId}`)
        .maybeSingle();

      if (dbProd) {
        if (dbProd.image) imagesToClean.push(dbProd.image);
        if (Array.isArray(dbProd.images)) {
          imagesToClean.push(...dbProd.images.filter((img): img is string => Boolean(img)));
        }
      }
    } catch (err) {
      console.warn("[products/delete] Pre-delete query note:", err);
    }

    // Step 1: Foreign Key Cascade Order Deletion from Database
    try {
      const uuid = stringToUuid(productId);

      try {
        await supabase.from("inventory").delete().eq("product_id", uuid);
      } catch {}

      try {
        await supabase.from("product_variants").delete().eq("product_id", uuid);
      } catch {}

      try {
        await supabase.from("product_reviews").delete().eq("product_id", uuid);
      } catch {}

      try {
        await supabase.from("product_images").delete().eq("product_id", uuid);
      } catch {}

      try {
        await supabase.from("cart_items").delete().eq("product_id", uuid);
      } catch {}
    } catch (cascadeErr) {
      console.warn("[products/delete] Foreign key cascade deletion note:", cascadeErr);
    }

    // Step 2: Delete product row via primary deleteProduct handler
    await deleteProduct(productId);

    // Step 3: Remove uploaded image assets from Cloudinary / storage
    if (imagesToClean.length > 0) {
      await cleanupCloudinaryImages(Array.from(new Set(imagesToClean)));
    }

    return Response.json({
      ok: true,
      message: `Product "${productId}" has been permanently deleted from database.`,
    });
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message.toLowerCase().includes("admin"));

    console.error("[products/delete] Permanent product deletion failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to delete product." },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
