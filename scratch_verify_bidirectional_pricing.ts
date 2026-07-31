import {
  recalculateFromSellingPrice,
  recalculateFromProfit,
  recalculateFromMargin,
} from "./lib/pricing-engine";

function runBiDirectionalTests() {
  console.log("=== BI-DIRECTIONAL PRICING ENGINE VERIFICATION ===");

  const cost = 10.00;
  console.log(`Base CJ Cost Price: $${cost.toFixed(2)}\n`);

  // Test Case 1: Edit Selling Price to $25.00
  console.log("--- Test 1: Editing Selling Price -> $25.00 ---");
  const res1 = recalculateFromSellingPrice(cost, 25.00);
  console.log(`  Selling Price : $${res1.sellingPrice.toFixed(2)}`);
  console.log(`  Profit        : $${res1.profit.toFixed(2)} (Expected: $15.00)`);
  console.log(`  Margin        : ${res1.marginPercent.toFixed(2)}% (Expected: 60.00%)`);

  if (res1.profit !== 15.00 || res1.marginPercent !== 60.00) {
    throw new Error("Test 1 failed!");
  }
  console.log("  ✓ Test 1 PASSED");

  // Test Case 2: Edit Net Profit to $20.00
  console.log("\n--- Test 2: Editing Net Profit -> $20.00 ---");
  const res2 = recalculateFromProfit(cost, 20.00);
  console.log(`  Selling Price : $${res2.sellingPrice.toFixed(2)} (Expected: $30.00)`);
  console.log(`  Profit        : $${res2.profit.toFixed(2)}`);
  console.log(`  Margin        : ${res2.marginPercent.toFixed(2)}% (Expected: 66.67%)`);

  if (res2.sellingPrice !== 30.00 || res2.marginPercent !== 66.67) {
    throw new Error("Test 2 failed!");
  }
  console.log("  ✓ Test 2 PASSED");

  // Test Case 3: Edit Margin Percentage to 50.00%
  console.log("\n--- Test 3: Editing Profit Margin -> 50.00% ---");
  const res3 = recalculateFromMargin(cost, 50.00);
  console.log(`  Selling Price : $${res3.sellingPrice.toFixed(2)} (Expected: $20.00)`);
  console.log(`  Profit        : $${res3.profit.toFixed(2)} (Expected: $10.00)`);
  console.log(`  Margin        : ${res3.marginPercent.toFixed(2)}%`);

  if (res3.sellingPrice !== 20.00 || res3.profit !== 10.00) {
    throw new Error("Test 3 failed!");
  }
  console.log("  ✓ Test 3 PASSED");

  // Test Case 4: Edit Margin Percentage to 75.00% with Cost $20.00
  console.log("\n--- Test 4: Editing Profit Margin -> 75.00% (Cost $20.00) ---");
  const res4 = recalculateFromMargin(20.00, 75.00);
  console.log(`  Selling Price : $${res4.sellingPrice.toFixed(2)} (Expected: $80.00)`);
  console.log(`  Profit        : $${res4.profit.toFixed(2)} (Expected: $60.00)`);
  console.log(`  Margin        : ${res4.marginPercent.toFixed(2)}%`);

  if (res4.sellingPrice !== 80.00 || res4.profit !== 60.00) {
    throw new Error("Test 4 failed!");
  }
  console.log("  ✓ Test 4 PASSED");

  console.log("\n======================================================");
  console.log("🎉 ALL BI-DIRECTIONAL PRICING CALCULATIONS PASSED!");
  console.log("======================================================\n");
}

runBiDirectionalTests();
