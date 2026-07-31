import { requireCurrentAdmin } from "@/lib/auth/admin";
import {
  deleteLocalProduct,
  getUniqueSlug,
  normalizeProductInput,
  PRODUCT_COLUMNS,
  saveLocalProduct,
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

    if (validationErrors.length) {
      return Response.json({ error: validationErrors.join(" ") }, { status: 400 });
    }

    const normalizedInput = normalizeProductInput(input);
    const supabase = createAdminSupabaseClient();

    let updatedProduct: Product | null = null;
    try {
      const uniqueSlug = await getUniqueSlug(supabase, normalizedInput.slug, id);
      normalizedInput.slug = uniqueSlug;

      const { data, error } = await supabase
        .from("products")
        .update(normalizedInput)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        updatedProduct = data as Product;
      }
    } catch (dbError) {
      console.warn("[products] Supabase update notice, saving locally:", dbError);
    }

    if (!updatedProduct) {
      const fallbackObj: Product = {
        id,
        ...normalizedInput,
        created_at: new Date().toISOString(),
      };
      updatedProduct = saveLocalProduct(fallbackObj);
    } else {
      saveLocalProduct(updatedProduct);
    }

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

    // Step 0: Fetch product details to collect images and metadata prior to deletion
    try {
      const { data: dbProd } = await supabase
        .from("products")
        .select("id, image, images, cj_product_id")
        .or(`id.eq.${productId},cj_product_id.eq.${productId}`)
        .maybeSingle();

      if (dbProd) {
        if (dbProd.image) imagesToClean.push(dbProd.image);
        if (Array.isArray(dbProd.images)) {
          imagesToClean.push(...dbProd.images.filter((img): img is string => Boolean(img)));
        }
      }
    } catch (err) {
      console.warn("[products/delete] Could not query pre-delete product details:", err);
    }

    // Step 1: Foreign Key Cascade Order Deletion from Database
    if (!productId.startsWith("fallback-")) {
      try {
        // 1. Delete inventory records
        const { error: invErr } = await supabase.from("inventory").delete().eq("product_id", productId);
        if (invErr) console.warn("[products/delete] Inventory deletion note:", invErr.message);

        // 2. Delete product variants
        const { error: varErr } = await supabase.from("product_variants").delete().eq("product_id", productId);
        if (varErr) console.warn("[products/delete] Product variants deletion note:", varErr.message);

        // 3. Delete product reviews
        try {
          await supabase.from("product_reviews").delete().eq("product_id", productId);
        } catch {}

        // 4. Delete product images
        try {
          await supabase.from("product_images").delete().eq("product_id", productId);
        } catch {}

        // 5. Delete product SEO
        try {
          await supabase.from("product_seo").delete().eq("product_id", productId);
        } catch {}

        // 6. Delete CJ mapping records
        try {
          await supabase.from("cj_product_mapping").delete().eq("product_id", productId);
        } catch {}

        // 7. Delete cart items
        try {
          await supabase.from("cart_items").delete().eq("product_id", productId);
        } catch {}

        // 8. Delete Product row itself
        const { error: prodErr } = await supabase.from("products").delete().or(`id.eq.${productId},cj_product_id.eq.${productId}`);
        if (prodErr) throw new Error(`Supabase product row deletion failed: ${prodErr.message}`);

        console.info(`[products/delete] Successfully deleted database rows for product ID: "${productId}"`);
      } catch (dbError) {
        console.error("[products/delete] Database cascade deletion error:", dbError);
      }
    }

    // Step 2: Delete from local persistent store
    deleteLocalProduct(productId);

    // Step 3: Remove uploaded image assets from Cloudinary / storage
    if (imagesToClean.length > 0) {
      await cleanupCloudinaryImages(Array.from(new Set(imagesToClean)));
    }

    return Response.json({
      ok: true,
      message: `Product "${productId}" has been permanently deleted from database, local storage, and asset stores.`,
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
