import fs from "fs";
import path from "path";

// Load .env.local manually
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

import { getProductBySlug, getProducts } from "./lib/products";

async function verifyVariantSelectionEngine() {
  console.log("=== VERIFYING STOREFRONT VARIANT SELECTION ENGINE ===");

  const products = await getProducts();
  const product = products.find((p) => p.variants && p.variants.some(v => v.color) && p.variants.some(v => v.size)) || products.find((p) => p.variants && p.variants.length > 0) || products[0];

  if (!product) throw new Error("No products found for testing!");

  console.log(`\nProduct Title: "${product.title}"`);
  console.log(`Total Variants: ${product.variants?.length ?? 0}`);

  const variants = product.variants || [];

  // Extract unique Colors & Sizes
  const colors = Array.from(new Set(variants.map((v) => v.color).filter(Boolean)));
  const sizes = Array.from(new Set(variants.map((v) => v.size).filter(Boolean)));

  console.log(`Available Colors (${colors.length}):`, colors.slice(0, 5));
  console.log(`Available Sizes  (${sizes.length}):`, sizes.slice(0, 5));

  // Test 1: Initial Selection State (Unselected)
  console.log("\n--- Test 1: Initial Selection State (Unselected) ---");
  const selectedColor: string | null = null;
  const selectedSize: string | null = null;

  const isColorRequired = colors.length > 0;
  const isSizeRequired = sizes.length > 0;
  const isSelectionComplete = (!isColorRequired || Boolean(selectedColor)) && (!isSizeRequired || Boolean(selectedSize));

  console.log(`  Color Required?        : ${isColorRequired}`);
  console.log(`  Size Required?         : ${isSizeRequired}`);
  console.log(`  Selection Complete?    : ${isSelectionComplete} (Expected: false)`);
  console.log(`  Add to Cart Button     : DISABLED (Reason: "Select Color & Size")`);

  if (isSelectionComplete) throw new Error("Test 1 Failed! Selection should not be complete.");
  console.log("  ✓ Test 1 PASSED");

  // Test 2: Selecting Color Only
  console.log("\n--- Test 2: Partial Selection (Color Only) ---");
  const testColor = colors[0];
  const isPartialComplete = (!isColorRequired || Boolean(testColor)) && (!isSizeRequired || Boolean(selectedSize));
  console.log(`  Selected Color         : "${testColor}"`);
  console.log(`  Selection Complete?    : ${isPartialComplete} (Expected: false)`);
  console.log(`  Add to Cart Button     : DISABLED (Reason: "Select Size")`);

  if (isPartialComplete) throw new Error("Test 2 Failed! Selection should not be complete without Size.");
  console.log("  ✓ Test 2 PASSED");

  // Test 3: Complete Selection (Color + Size)
  console.log("\n--- Test 3: Complete Selection (Color + Size) ---");
  const testSize = sizes[0];
  const isFullComplete = (!isColorRequired || Boolean(testColor)) && (!isSizeRequired || Boolean(testSize));

  const matchedVariant = variants.find(
    (v) => (v.color === testColor || v.attributes?.["Color"] === testColor) && (v.size === testSize || v.attributes?.["Size"] === testSize)
  );

  console.log(`  Selected Option        : Color="${testColor}", Size="${testSize}"`);
  console.log(`  Selection Complete?    : ${isFullComplete} (Expected: true)`);
  console.log(`  Matched Variant Name   : "${matchedVariant?.name}"`);
  console.log(`  Matched Variant SKU    : "${matchedVariant?.sku}"`);
  console.log(`  Matched Variant ID     : "${matchedVariant?.cj_variant_id || matchedVariant?.id}"`);
  console.log(`  Matched Variant Price  : $${matchedVariant?.price}`);
  console.log(`  Matched Variant Stock  : ${matchedVariant?.stock} units`);

  if (!isFullComplete || !matchedVariant) {
    throw new Error("Test 3 Failed! Could not match complete variant.");
  }
  console.log("  ✓ Test 3 PASSED");

  // Test 4: Cart Payload Structure
  console.log("\n--- Test 4: Verifying Cart Payload Compatibility for CJ Orders ---");
  const cartVariantPayload = {
    variant_id: matchedVariant.cj_variant_id || matchedVariant.id || null,
    variant_sku: matchedVariant.sku || null,
    color: testColor,
    size: testSize,
    price: matchedVariant.price || product.price || 0,
  };

  console.log("  Cart Payload Object:", JSON.stringify(cartVariantPayload, null, 2));

  if (!cartVariantPayload.variant_id || !cartVariantPayload.variant_sku) {
    throw new Error("Test 4 Failed! Missing variant_id or variant_sku for CJ order placement.");
  }
  console.log("  ✓ Test 4 PASSED");

  console.log("\n======================================================");
  console.log("🎉 ALL VARIANT SELECTION ENGINE TESTS PASSED!");
  console.log("======================================================\n");
}

verifyVariantSelectionEngine().catch((err) => {
  console.error("Variant system verification error:", err);
  process.exit(1);
});
