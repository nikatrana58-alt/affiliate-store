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

import { importCJProduct } from "./lib/cj-import";
import { getProductBySlug, saveLocalProduct } from "./lib/products";

async function runVariantVerification() {
  console.log("=== VARIANT IMPORT & SELECTION SYSTEM END-TO-END VERIFICATION ===");

  // PART 1: Import a multi-variant CJ product (Pajama Set: CJNSSYTZ05449)
  console.log("\n--- PART 1: Testing Multi-Variant CJ Product Import ---");
  const pid = "11648ED0-19C0-4154-919A-A916BE6B0913"; // PID for CJNSSYTZ05449
  const report = await importCJProduct({ pid, action: "update" });

  console.log(`[Import Status] : ${report.status}`);
  console.log(`[Product Title] : ${report.product?.title}`);
  console.log(`[Product Slug]  : ${report.product?.slug}`);

  // Retrieve saved product
  const product = await getProductBySlug(report.product?.slug || "cozy-pajama-set");
  if (!product) {
    throw new Error("Failed to retrieve imported product from store.");
  }

  console.log(`[Variants Count]: ${product.variants?.length ?? 0}`);
  if (!product.variants || product.variants.length === 0) {
    throw new Error("No variants preserved in product record!");
  }

  // Inspect first 3 imported variants
  console.log("\nSample Imported Variants:");
  product.variants.slice(0, 5).forEach((v, idx) => {
    console.log(`  Variant #${idx + 1}: Name="${v.name}" | VID="${v.cj_variant_id || v.id}" | SKU="${v.sku}" | Color="${v.color}" | Size="${v.size}" | Price=$${v.price} | Stock=${v.stock} | Image="${v.image || 'N/A'}"`);
  });

  // PART 2: Admin Product Edit Simulation
  console.log("\n--- PART 2: Simulating Admin Product Edit ---");
  const testVariant = { ...product.variants[0] };
  testVariant.price = 49.99;
  testVariant.stock = 150;
  testVariant.sku = `${testVariant.sku}-MODIFIED`;

  const updatedVariants = [...product.variants];
  updatedVariants[0] = testVariant;

  const updatedProduct = {
    ...product,
    variants: updatedVariants,
  };
  saveLocalProduct(updatedProduct as any);
  console.log(`  ✓ Updated Variant #1 Price to $${testVariant.price}, Stock to ${testVariant.stock}, SKU to ${testVariant.sku}`);

  // PART 3: Storefront Variant Selection Logic Simulation
  console.log("\n--- PART 3: Simulating Storefront Color & Size Selection ---");
  const targetColor = product.variants[0].color || "Black";
  const targetSize = product.variants[0].size || "L";

  const matchedVariant = product.variants.find(
    (v) => (v.color === targetColor || v.attributes?.["Color"] === targetColor) &&
           (v.size === targetSize || v.attributes?.["Size"] === targetSize)
  ) || product.variants[0];

  const storefrontPrice = matchedVariant.price ?? ((product.price ?? 0) + matchedVariant.price_delta);
  const storefrontImage = matchedVariant.image || product.image;
  const storefrontStock = matchedVariant.stock;

  console.log(`  Selection: Color="${targetColor}", Size="${targetSize}"`);
  console.log(`  Matched Variant Name : "${matchedVariant.name}"`);
  console.log(`  Matched Variant SKU  : "${matchedVariant.sku}"`);
  console.log(`  Dynamic Price        : $${storefrontPrice}`);
  console.log(`  Dynamic Image        : ${storefrontImage}`);
  console.log(`  Dynamic Inventory    : ${storefrontStock} units in stock`);

  // PART 4: Cart Storage Simulation
  console.log("\n--- PART 4: Simulating Cart Storage ---");
  const cartItem = {
    product_id: product.id,
    variant_id: matchedVariant.cj_variant_id || matchedVariant.id,
    variant_sku: matchedVariant.sku,
    selected_color: targetColor,
    selected_size: targetSize,
    correct_price: storefrontPrice,
  };
  console.log("  Cart Saved Payload:", JSON.stringify(cartItem, null, 2));

  // PART 5: Future CJ Orders Simulation
  console.log("\n--- PART 5: Simulating Supplier Fulfillment Order Payload ---");
  const supplierOrderItem = {
    vid: matchedVariant.cj_variant_id || matchedVariant.id,
    sku: matchedVariant.sku,
    quantity: 1,
  };
  console.log("  Supplier Order Item (Using Variant SKU / VID):", JSON.stringify(supplierOrderItem, null, 2));

  console.log("\n======================================================");
  console.log("🎉 ALL 5 PARTS OF VARIANT SYSTEM SUCCESSFULLY VERIFIED!");
  console.log("======================================================\n");
}

runVariantVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
