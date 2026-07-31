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

import { getProducts, saveLocalProduct, normalizeProductInput, getLocalProducts } from "./lib/products";
import { calculateProfitMetrics, recalculateFromProfit, recalculateFromMargin, recalculateFromSellingPrice } from "./lib/pricing-engine";

async function verifyProductPricingSave() {
  console.log("=== COMPREHENSIVE PRODUCT PRICING SAVE VERIFICATION ===");

  const products = getLocalProducts();
  if (!products.length) throw new Error("No products found to test!");

  const testProduct = products[0];
  console.log(`\nOriginal Product: "${testProduct.title}" (ID: ${testProduct.id})`);
  console.log("Original Values Before Save:");
  console.log(`  Selling Price : $${testProduct.price}`);
  console.log(`  Cost Price    : $${testProduct.cost_price ?? "N/A"}`);
  console.log(`  Profit        : $${testProduct.profit ?? "N/A"}`);
  console.log(`  Margin %      : ${testProduct.margin_percent ?? "N/A"}%`);

  const baseCost = testProduct.cost_price || 10.0;

  // TEST 1: Changing Selling Price to $39.99
  console.log("\n--- TEST 1: Save After Editing Selling Price ($39.99) ---");
  const newSellPrice = 39.99;
  const metrics1 = recalculateFromSellingPrice(baseCost, newSellPrice);

  const input1 = normalizeProductInput({
    ...testProduct,
    cost_price: baseCost,
    price: metrics1.sellingPrice,
    profit: metrics1.profit,
    margin_percent: metrics1.marginPercent,
    price_manually_overridden: true,
  });

  const updated1 = saveLocalProduct({
    id: testProduct.id,
    ...input1,
    created_at: testProduct.created_at,
  });

  console.log("  Saved Values in DB/Store:");
  console.log(`    Price           : $${updated1.price}`);
  console.log(`    Cost Price      : $${updated1.cost_price}`);
  console.log(`    Profit          : $${updated1.profit}`);
  console.log(`    Margin %        : ${updated1.margin_percent}%`);

  // Reload from store
  const reloaded1 = getLocalProducts().find((p) => p.id === testProduct.id);
  if (reloaded1?.price !== 39.99 || reloaded1?.profit !== metrics1.profit) {
    throw new Error("Test 1 Failed! Saved values did not persist upon reload.");
  }
  console.log("  ✓ TEST 1 (SELLING PRICE SAVE) PASSED!");

  // TEST 2: Changing Profit to $25.00
  console.log("\n--- TEST 2: Save After Editing Profit ($25.00) ---");
  const targetProfit = 25.0;
  const metrics2 = recalculateFromProfit(baseCost, targetProfit);

  const input2 = normalizeProductInput({
    ...testProduct,
    cost_price: baseCost,
    price: metrics2.sellingPrice,
    profit: metrics2.profit,
    margin_percent: metrics2.marginPercent,
    price_manually_overridden: true,
  });

  const updated2 = saveLocalProduct({
    id: testProduct.id,
    ...input2,
    created_at: testProduct.created_at,
  });

  console.log("  Saved Values in DB/Store:");
  console.log(`    Price           : $${updated2.price}`);
  console.log(`    Cost Price      : $${updated2.cost_price}`);
  console.log(`    Profit          : $${updated2.profit}`);
  console.log(`    Margin %        : ${updated2.margin_percent}%`);

  const reloaded2 = getLocalProducts().find((p) => p.id === testProduct.id);
  if (reloaded2?.profit !== 25.0 || reloaded2?.price !== metrics2.sellingPrice) {
    throw new Error("Test 2 Failed! Profit save did not persist upon reload.");
  }
  console.log("  ✓ TEST 2 (PROFIT SAVE) PASSED!");

  // TEST 3: Changing Margin to 60.00%
  console.log("\n--- TEST 3: Save After Editing Margin (60.00%) ---");
  const targetMargin = 60.0;
  const metrics3 = recalculateFromMargin(baseCost, targetMargin);

  const input3 = normalizeProductInput({
    ...testProduct,
    cost_price: baseCost,
    price: metrics3.sellingPrice,
    profit: metrics3.profit,
    margin_percent: metrics3.marginPercent,
    price_manually_overridden: true,
  });

  const updated3 = saveLocalProduct({
    id: testProduct.id,
    ...input3,
    created_at: testProduct.created_at,
  });

  console.log("  Saved Values in DB/Store:");
  console.log(`    Price           : $${updated3.price}`);
  console.log(`    Cost Price      : $${updated3.cost_price}`);
  console.log(`    Profit          : $${updated3.profit}`);
  console.log(`    Margin %        : ${updated3.margin_percent}%`);

  const reloaded3 = getLocalProducts().find((p) => p.id === testProduct.id);
  if (reloaded3?.margin_percent !== 60.0 || reloaded3?.price !== metrics3.sellingPrice) {
    throw new Error("Test 3 Failed! Margin save did not persist upon reload.");
  }
  console.log("  ✓ TEST 3 (MARGIN SAVE) PASSED!");

  console.log("\n======================================================");
  console.log("🎉 ALL PRODUCT PRICING PERSISTENCE TESTS PASSED!");
  console.log("======================================================\n");
}

verifyProductPricingSave().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
