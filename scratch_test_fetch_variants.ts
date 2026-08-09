import fs from "fs";
import path from "path";

// Load .env.local
try {
  const envPath = path.resolve(".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {}

import { createPublicSupabaseClient } from "./lib/supabase";
import { stringToUuid } from "./lib/products";

async function testFetchVariantsFromSupabase() {
  const slug = "love-hug-necklace-unisex-men-women-couple-jewelry-simple-temperament-clavicle-chain-valentines-day-lover-gift";
  console.log(`=== TESTING PRODUCT VARIANT FETCH FOR SLUG: ${slug} ===`);

  const supabase = createPublicSupabaseClient();

  // 1. Get product row
  const { data: prod, error: pErr } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (pErr || !prod) {
    console.error("Product not found:", pErr);
    return;
  }

  console.log("Product ID (UUID):", prod.id);

  // 2. Fetch product_variants
  const { data: variants, error: vErr } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", prod.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  console.log("Variants count:", variants?.length ?? 0);

  // 3. Fetch inventory for these variants
  const variantIds = (variants || []).map((v) => v.id);
  const { data: invData } = await supabase
    .from("inventory")
    .select("variant_id, stock_quantity")
    .in("variant_id", variantIds);

  const invMap = new Map((invData || []).map((i) => [i.variant_id, i.stock_quantity]));

  // 4. Map to ProductVariantItem
  const mappedVariants = (variants || []).map((v) => {
    const attrs = (v.attributes as Record<string, string>) || {};
    return {
      id: v.id,
      cj_variant_id: v.cj_variant_id,
      name: v.name,
      sku: v.sku,
      color: attrs.Color || attrs.color || null,
      size: attrs.Size || attrs.size || null,
      price_delta: v.price_delta || 0,
      stock: invMap.get(v.id) ?? 999,
      attributes: attrs,
    };
  });

  console.log("\nMapped Variants Count:", mappedVariants.length);
  if (mappedVariants.length > 0) {
    console.log("First 3 mapped variants:", mappedVariants.slice(0, 3));
  }
}

testFetchVariantsFromSupabase().catch(console.error);
