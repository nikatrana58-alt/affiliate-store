/**
 * scratch_test_smart_pricing_v2.ts
 *
 * Full Verification Script for Smart Pricing Engine V2:
 * 1. Base Rule: Supplier cost immutable ($15.50 for XS/S/M, $20.00 for 2XL/3XL).
 * 2. Smart Profit ($5): XS/S/M = $20.50, 2XL/3XL = $25.00.
 * 3. Modes: fixed_profit, markup_percent (30%), manual_override.
 * 4. Global Changes: Updating profit to $10 updates all AUTO variants, preserving MANUAL overrides.
 * 5. Campaign System: -20% discount applies dynamically without altering supplier cost.
 * 6. Sync: Supplier cost update recalculates AUTO variants only.
 */

import { SmartPricingEngine, SmartProductPricingInput } from "./lib/pricing/smart-pricing-engine";

function runV2Tests() {
  console.log("=================================================");
  console.log("   SMART PRICING ENGINE V2 VERIFICATION SUITE    ");
  console.log("=================================================\n");

  const initialProduct: SmartProductPricingInput = {
    globalPricingMode: "fixed_profit",
    globalProfit: 5.0,
    globalMarkupPercent: 30.0,
    campaign: null,
    variants: [
      { id: "v-xs", name: "White / XS", supplierCost: 15.5 },
      { id: "v-s", name: "White / S", supplierCost: 15.5 },
      { id: "v-m", name: "White / M", supplierCost: 15.5 },
      { id: "v-2xl", name: "White / 2XL", supplierCost: 20.0 },
      { id: "v-3xl", name: "White / 3XL", supplierCost: 20.0, pricingMode: "manual_override", manualOverridePrice: 29.99 },
    ],
  };

  // --- TEST 1: Fixed Profit $5 ---
  console.log("--- TEST 1: Fixed Profit ($5.00) ---");
  let calc = SmartPricingEngine.calculate(initialProduct);
  
  console.log(`XS Final:  $${calc.variants[0].finalPrice} (Expected: $20.50)`);
  console.log(`S Final:   $${calc.variants[1].finalPrice} (Expected: $20.50)`);
  console.log(`2XL Final: $${calc.variants[3].finalPrice} (Expected: $25.00)`);
  console.log(`3XL Final: $${calc.variants[4].finalPrice} (Manual Override Expected: $29.99)`);
  console.log(`Display Price across Storefront: $${calc.displayPrice} (Lowest Variant)\n`);

  if (calc.variants[0].finalPrice !== 20.5) throw new Error("Test 1 Failed for XS");
  if (calc.variants[3].finalPrice !== 25.0) throw new Error("Test 1 Failed for 2XL");
  if (calc.variants[4].finalPrice !== 29.99) throw new Error("Test 1 Failed for 3XL Manual");

  // --- TEST 2: Fixed Profit $10 ---
  console.log("--- TEST 2: Global Profit Update ($10.00) ---");
  const profit10Product: SmartProductPricingInput = {
    ...initialProduct,
    globalProfit: 10.0,
  };
  calc = SmartPricingEngine.calculate(profit10Product);

  console.log(`XS Final:  $${calc.variants[0].finalPrice} (Expected: $25.50)`);
  console.log(`2XL Final: $${calc.variants[3].finalPrice} (Expected: $30.00)`);
  console.log(`3XL Final: $${calc.variants[4].finalPrice} (Manual Override Preserved: $29.99)\n`);

  if (calc.variants[0].finalPrice !== 25.5) throw new Error("Test 2 Failed for XS");
  if (calc.variants[3].finalPrice !== 30.0) throw new Error("Test 2 Failed for 2XL");
  if (calc.variants[4].finalPrice !== 29.99) throw new Error("Test 2 Preserved Manual Override Failed");

  // --- TEST 3: Markup Mode 30% ---
  console.log("--- TEST 3: Markup Mode (30%) ---");
  const markupProduct: SmartProductPricingInput = {
    ...initialProduct,
    globalPricingMode: "markup_percent",
    globalMarkupPercent: 30.0,
  };
  calc = SmartPricingEngine.calculate(markupProduct);

  console.log(`XS Final:  $${calc.variants[0].finalPrice} (15.5 * 1.3 = $20.15)`);
  console.log(`2XL Final: $${calc.variants[3].finalPrice} (20 * 1.3 = $26.00)`);
  console.log(`3XL Final: $${calc.variants[4].finalPrice} (Manual Override Preserved: $29.99)\n`);

  if (calc.variants[0].finalPrice !== 20.15) throw new Error("Test 3 Failed for XS Markup");
  if (calc.variants[3].finalPrice !== 26.0) throw new Error("Test 3 Failed for 2XL Markup");

  // --- TEST 4: Campaign System (-20%) ---
  console.log("--- TEST 4: Campaign Discount (-20%) ---");
  const campaignProduct: SmartProductPricingInput = {
    ...initialProduct,
    campaign: {
      name: "Black Friday Sale",
      type: "percent",
      value: -20,
      active: true,
    },
  };
  calc = SmartPricingEngine.calculate(campaignProduct);

  console.log(`XS Base: $20.50 -> Campaign -20% -> Final: $${calc.variants[0].finalPrice} (Expected: $16.40)`);
  console.log(`2XL Base: $25.00 -> Campaign -20% -> Final: $${calc.variants[3].finalPrice} (Expected: $20.00)`);
  console.log(`Supplier Costs Intact: XS=$${calc.variants[0].supplierCost}, 2XL=$${calc.variants[3].supplierCost}\n`);

  if (calc.variants[0].finalPrice !== 16.4) throw new Error("Test 4 Failed for XS Campaign");
  if (calc.variants[3].finalPrice !== 20.0) throw new Error("Test 4 Failed for 2XL Campaign");

  // --- TEST 5: Supplier Cost Sync Update ---
  console.log("--- TEST 5: Supplier Cost Update Sync ---");
  const updatedCostProduct: SmartProductPricingInput = {
    ...initialProduct,
    variants: [
      { id: "v-xs", name: "White / XS", supplierCost: 18.0 }, // Cost increased from $15.5 to $18.0
      { id: "v-s", name: "White / S", supplierCost: 15.5 },
      { id: "v-m", name: "White / M", supplierCost: 15.5 },
      { id: "v-2xl", name: "White / 2XL", supplierCost: 20.0 },
      { id: "v-3xl", name: "White / 3XL", supplierCost: 20.0, pricingMode: "manual_override", manualOverridePrice: 29.99 },
    ],
  };
  calc = SmartPricingEngine.calculate(updatedCostProduct);

  console.log(`XS New Cost: $18.00 + Profit $5.00 -> New Final: $${calc.variants[0].finalPrice} (Expected: $23.00)`);
  console.log(`3XL Manual Override Preserved: $${calc.variants[4].finalPrice}\n`);

  if (calc.variants[0].finalPrice !== 23.0) throw new Error("Test 5 Failed for XS Cost Update");
  if (calc.variants[4].finalPrice !== 29.99) throw new Error("Test 5 Failed Manual Override Protection");

  console.log("=================================================");
  console.log("🎉 ALL 5 SMART PRICING V2 SUITE TESTS PASSED!");
  console.log("=================================================");
}

runV2Tests();
